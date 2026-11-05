import CoreGraphics
import CoreImage
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers
import XCTest
@testable import FerbyVisionCore

final class FerbyVisionCoreTests: XCTestCase {
    private func encodePng(_ cgImage: CGImage) throws -> Data {
        let mutableData = NSMutableData()
        guard let dest = CGImageDestinationCreateWithData(
            mutableData,
            UTType.png.identifier as CFString,
            1,
            nil
        ) else {
            XCTFail("Failed to create PNG image destination")
            return Data()
        }
        CGImageDestinationAddImage(dest, cgImage, nil)
        XCTAssertTrue(CGImageDestinationFinalize(dest))
        return mutableData as Data
    }

    private func makeSyntheticTextPng(text: String, width: Int = 480, height: Int = 140) throws -> Data {
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        guard let ctx = CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width * 4,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            XCTFail("Failed to create CGContext")
            return Data()
        }

        ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
        ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))

        let font = CTFontCreateWithName("Helvetica-Bold" as CFString, 44, nil)
        let attributes: [NSAttributedString.Key: Any] = [
            NSAttributedString.Key(kCTFontAttributeName as String): font,
            NSAttributedString.Key(kCTForegroundColorAttributeName as String): CGColor(
                red: 0,
                green: 0,
                blue: 0,
                alpha: 1
            )
        ]
        let attrString = NSAttributedString(string: text, attributes: attributes)
        let line = CTLineCreateWithAttributedString(attrString)
        ctx.textPosition = CGPoint(x: 28, y: 52)
        CTLineDraw(line, ctx)

        guard let cgImage = ctx.makeImage() else {
            XCTFail("Failed to make CGImage")
            return Data()
        }
        return try encodePng(cgImage)
    }

    private func makeSyntheticQrPng(payload: String) throws -> Data {
        guard let filter = CIFilter(name: "CIQRCodeGenerator") else {
            XCTFail("Missing CIQRCodeGenerator filter")
            return Data()
        }
        filter.setValue(Data(payload.utf8), forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")
        guard let outputImage = filter.outputImage else {
            XCTFail("Missing QR output image")
            return Data()
        }
        let scaled = outputImage.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
        let ciContext = CIContext(options: nil)
        guard let cgImage = ciContext.createCGImage(scaled, from: scaled.extent) else {
            XCTFail("Failed to render QR CGImage")
            return Data()
        }
        return try encodePng(cgImage)
    }

    func testRecognizesGeneratedSyntheticTextAndSerializesCodableEnvelope() throws {
        let pngBytes = try makeSyntheticTextPng(text: "FERBY 2026")
        let request = VisionRequest(
            mode: .ocr,
            imageBytes: pngBytes,
            languages: ["en-US"],
            preserveLineBreaks: true,
            maxResults: 10
        )

        let encodedReq = try JSONEncoder().encode(request)
        let decodedReq = try JSONDecoder().decode(VisionRequest.self, from: encodedReq)
        XCTAssertEqual(decodedReq, request)

        let response = try FerbyVisionRecognizer.recognize(decodedReq)
        XCTAssertEqual(response.schemaVersion, 1)
        XCTAssertTrue(
            response.recognizedText.uppercased().contains("FERBY"),
            "Expected OCR text to contain FERBY, got: \(response.recognizedText)"
        )
        XCTAssertFalse(response.textBlocks.isEmpty)
        XCTAssertTrue(response.qrCodes.isEmpty)
    }

    func testRecognizesGeneratedSyntheticQrPayload() throws {
        let expectedPayload = "https://ferby.local/qr-check-42"
        let qrBytes = try makeSyntheticQrPng(payload: expectedPayload)
        let request = VisionRequest(
            mode: .qr,
            imageBytes: qrBytes,
            languages: ["en-US"],
            preserveLineBreaks: true,
            maxResults: 5
        )

        let response = try FerbyVisionRecognizer.recognize(request)
        XCTAssertEqual(response.qrCodes.count, 1)
        XCTAssertEqual(response.qrCodes.first?.payload, expectedPayload)
        XCTAssertTrue(response.recognizedText.isEmpty)
    }

    func testRejectsMalformedInputsUnsupportedLanguagesAndBoundsViolations() {
        XCTAssertThrowsError(
            try FerbyVisionRecognizer.recognize(
                VisionRequest(schemaVersion: 99, imageBytes: Data([1, 2, 3]))
            )
        ) { error in
            XCTAssertEqual(error as? VisionCoreError, .unsupportedSchemaVersion(99))
        }

        XCTAssertThrowsError(
            try FerbyVisionRecognizer.recognize(
                VisionRequest(imageBytes: Data())
            )
        ) { error in
            XCTAssertEqual(error as? VisionCoreError, .emptyImageBytes)
        }

        XCTAssertThrowsError(
            try FerbyVisionRecognizer.recognize(
                VisionRequest(imageBytes: Data([0x89, 0x50, 0x4E, 0x47]), languages: ["xx-INVALID"])
            )
        ) { error in
            XCTAssertEqual(error as? VisionCoreError, .unsupportedLanguage("xx-INVALID"))
        }

        XCTAssertThrowsError(
            try FerbyVisionRecognizer.recognize(
                VisionRequest(imageBytes: Data([0x89, 0x50, 0x4E, 0x47]), maxResults: 0)
            )
        ) { error in
            XCTAssertEqual(error as? VisionCoreError, .invalidMaxResults(0))
        }

        XCTAssertThrowsError(
            try FerbyVisionRecognizer.recognize(
                VisionRequest(imageBytes: Data([0x00, 0x01, 0x02, 0x03]))
            )
        ) { error in
            XCTAssertEqual(error as? VisionCoreError, .invalidImageDecode)
        }
    }
}

