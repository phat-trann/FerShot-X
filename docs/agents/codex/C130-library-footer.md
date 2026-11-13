# C130 Matched Library footer heights

FTP and Local preview footers now share a compact 56px height. FTP status, path and errors sit on one row; long text ellipsizes while full path/error titles and accessible text remain available. Retry stays visible without expanding the footer.

Validation: injected browser regression confirms equal height/bottom alignment for Local, successful FTP and failed FTP with long paths/errors at the 800×540 minimum. No horizontal overflow; Retry remains visible. Screenshot inspected. No build, real server action, commit or push; visual acceptance pending.
