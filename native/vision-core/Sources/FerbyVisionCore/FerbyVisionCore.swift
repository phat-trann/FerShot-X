import CoreGraphics
import Foundation
import ImageIO
import Vision

public enum VisionCoreConstants {
    public static let currentSchemaVersion: Int = 1
    public static let minimumMacOSBaseline: String = "12.0"
    public static let maxImageBytes: Int = 20 * 1024 * 1024
    public static let maxImageDimension: Int = 16_384
    public static let maxImagePixels: Int = 40_000_000
    public static let maxResultsCap: Int = 200
    public static let maxLanguageTagLength: Int = 32
}

public enum VisionRecognitionMode: String, Codable, Equatable, Sendable {
    case ocr
    case qr
    case both
}

public struct VisionRequest: Codable, Equatable, Sendable {
    public let schemaVersion: Int
    public let mode: VisionRecognitionMode
    public let imageBytes: Data
    public let languages: [String]
    public let preserveLineBreaks: Bool
    public let usesLanguageCorrection: Bool
    public let maxResults: Int

    public init(
        schemaVersion: Int = VisionCoreConstants.currentSchemaVersion,
        mode: VisionRecognitionMode = .both,
        imageBytes: Data,
        languages: [String] = ["en-US"],
        preserveLineBreaks: Bool = true,
        usesLanguageCorrection: Bool = true,
        maxResults: Int = 50
    ) {
        self.schemaVersion = schemaVersion
        self.mode = mode
        self.imageBytes = imageBytes
        self.languages = languages
        self.preserveLineBreaks = preserveLineBreaks
        self.usesLanguageCorrection = usesLanguageCorrection
        self.maxResults = maxResults
    }
}

public struct VisionTextObservation: Codable, Equatable, Sendable {
    public let text: String
    public let confidence: Float

    public init(text: String, confidence: Float) {
        self.text = text
        self.confidence = confidence
    }
}

public struct VisionQrObservation: Codable, Equatable, Sendable {
    public let payload: String
    public let symbology: String

    public init(payload: String, symbology: String) {
        self.payload = payload
        self.symbology = symbology
    }
}

public struct VisionResponse: Codable, Equatable, Sendable {
    public let schemaVersion: Int
    public let recognizedText: String
    public let textBlocks: [VisionTextObservation]
    public let qrCodes: [VisionQrObservation]
    public let resolvedLanguages: [String]

    public init(
        schemaVersion: Int = VisionCoreConstants.currentSchemaVersion,
        recognizedText: String,
        textBlocks: [VisionTextObservation],
        qrCodes: [VisionQrObservation],
        resolvedLanguages: [String] = []
    ) {
        self.schemaVersion = schemaVersion
        self.recognizedText = recognizedText
        self.textBlocks = textBlocks
        self.qrCodes = qrCodes
        self.resolvedLanguages = resolvedLanguages
    }
}

public enum VisionCoreError: Error, Equatable, Codable, Sendable {
    case unsupportedSchemaVersion(Int)
    case emptyImageBytes
    case imageBytesTooLarge(Int)
    case invalidMaxResults(Int)
    case emptyLanguageList
    case unsupportedLanguage(String)
    case invalidImageDecode
    case imageDimensionsOutOfBounds(width: Int, height: Int)
    case imagePixelsTooLarge(Int)
    case visionExecutionFailed(String)
}

public enum FerbyVisionRecognizer {
    /// Queries Apple's Vision framework at runtime for the actual installed recognition languages
    /// on the current macOS 12+ system rather than relying on a static hardcoded allowlist.
    public static func runtimeSupportedLanguages(
        recognitionLevel: VNRequestTextRecognitionLevel = .accurate
    ) throws -> Set<String> {
        let req = VNRecognizeTextRequest()
        req.recognitionLevel = recognitionLevel
        do {
            let langs = try req.supportedRecognitionLanguages()
            return Set(langs)
        } catch {
            throw VisionCoreError.visionExecutionFailed(error.localizedDescription)
        }
    }

    private static func isWellFormedLanguageTag(_ tag: String) -> Bool {
        if tag.isEmpty || tag.count > VisionCoreConstants.maxLanguageTagLength {
            return false
        }
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_"))
        return tag.unicodeScalars.allSatisfy { allowed.contains($0) }
    }

    @discardableResult
    public static func validateRequest(
        _ request: VisionRequest,
        installedLanguages: Set<String>? = nil
    ) throws -> [String] {
        if request.schemaVersion != VisionCoreConstants.currentSchemaVersion {
            throw VisionCoreError.unsupportedSchemaVersion(request.schemaVersion)
        }
        if request.imageBytes.isEmpty {
            throw VisionCoreError.emptyImageBytes
        }
        if request.imageBytes.count > VisionCoreConstants.maxImageBytes {
            throw VisionCoreError.imageBytesTooLarge(request.imageBytes.count)
        }
        if request.maxResults < 1 || request.maxResults > VisionCoreConstants.maxResultsCap {
            throw VisionCoreError.invalidMaxResults(request.maxResults)
        }

        if request.mode == .ocr || request.mode == .both {
            if request.languages.isEmpty {
                throw VisionCoreError.emptyLanguageList
            }
            let runtimeSet = try installedLanguages ?? runtimeSupportedLanguages(recognitionLevel: .accurate)
            var normalized: [String] = []
            for lang in request.languages {
                let trimmed = lang.trimmingCharacters(in: .whitespacesAndNewlines)
                if !isWellFormedLanguageTag(trimmed) || !runtimeSet.contains(trimmed) {
                    throw VisionCoreError.unsupportedLanguage(lang)
                }
                if !normalized.contains(trimmed) {
                    normalized.append(trimmed)
                }
            }
            return normalized
        }

        return []
    }

    public static func decodeBoundedCGImage(from data: Data) throws -> CGImage {
        let options: [CFString: Any] = [
            kCGImageSourceShouldCache: false
        ]
        guard let source = CGImageSourceCreateWithData(data as CFData, options as CFDictionary),
              CGImageSourceGetCount(source) > 0,
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? Int,
              let height = properties[kCGImagePropertyPixelHeight] as? Int
        else {
            throw VisionCoreError.invalidImageDecode
        }

        if width < 1 || height < 1 ||
            width > VisionCoreConstants.maxImageDimension ||
            height > VisionCoreConstants.maxImageDimension {
            throw VisionCoreError.imageDimensionsOutOfBounds(width: width, height: height)
        }

        let (pixelCount, overflow) = width.multipliedReportingOverflow(by: height)
        if overflow || pixelCount > VisionCoreConstants.maxImagePixels {
            throw VisionCoreError.imagePixelsTooLarge(overflow ? Int.max : pixelCount)
        }

        guard let cgImage = CGImageSourceCreateImageAtIndex(source, 0, options as CFDictionary) else {
            throw VisionCoreError.invalidImageDecode
        }
        return cgImage
    }

    public static func recognize(_ request: VisionRequest) throws -> VisionResponse {
        let resolvedLanguages = try validateRequest(request)
        let cgImage = try decodeBoundedCGImage(from: request.imageBytes)
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

        var textBlocks: [VisionTextObservation] = []
        var qrCodes: [VisionQrObservation] = []

        if request.mode == .ocr || request.mode == .both {
            let textReq = VNRecognizeTextRequest()
            textReq.recognitionLevel = .accurate
            textReq.usesLanguageCorrection = request.usesLanguageCorrection
            textReq.recognitionLanguages = resolvedLanguages
            do {
                try handler.perform([textReq])
            } catch {
                throw VisionCoreError.visionExecutionFailed(error.localizedDescription)
            }
            let observations = textReq.results ?? []
            for obs in observations.prefix(request.maxResults) {
                if let candidate = obs.topCandidates(1).first {
                    let trimmed = candidate.string.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !trimmed.isEmpty {
                        textBlocks.append(
                            VisionTextObservation(
                                text: trimmed,
                                confidence: candidate.confidence
                            )
                        )
                    }
                }
            }
        }

        if request.mode == .qr || request.mode == .both {
            let barcodeReq = VNDetectBarcodesRequest()
            barcodeReq.symbologies = [.qr]
            do {
                try handler.perform([barcodeReq])
            } catch {
                throw VisionCoreError.visionExecutionFailed(error.localizedDescription)
            }
            let observations = barcodeReq.results ?? []
            for obs in observations.prefix(request.maxResults) {
                if let payload = obs.payloadStringValue, !payload.isEmpty {
                    qrCodes.append(
                        VisionQrObservation(
                            payload: payload,
                            symbology: obs.symbology.rawValue
                        )
                    )
                }
            }
        }

        let separator = request.preserveLineBreaks ? "\n" : " "
        let joinedText = textBlocks.map(\.text).joined(separator: separator)

        return VisionResponse(
            schemaVersion: VisionCoreConstants.currentSchemaVersion,
            recognizedText: joinedText,
            textBlocks: textBlocks,
            qrCodes: qrCodes,
            resolvedLanguages: resolvedLanguages
        )
    }
}
