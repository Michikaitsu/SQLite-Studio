const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure we don't start multiple instances
const additionalData = { myKey: 'myValue' };
const gotTheLock = app.requestSingleInstanceLock(additionalData);

if (!gotTheLock) {
    app.quit();
} else {
    app.whenReady().then(async () => {
        try {
            // Dynamic import for ESM module
            const pngToIcoMod = await import('png-to-ico');
            const pngToIco = pngToIcoMod.default || pngToIcoMod;

            const svgPath = path.join(__dirname, '../public/icon.svg');
            const pngPath = path.join(__dirname, '../public/icon.png');
            const icoPath = path.join(__dirname, '../public/icon.ico');

            if (!fs.existsSync(svgPath)) {
                console.error('Error: icon.svg not found at', svgPath);
                app.exit(1);
                return;
            }

            console.log('Generating icons from:', svgPath);

            const win = new BrowserWindow({
                show: false,
                width: 512,
                height: 512,
                webPreferences: {
                    offscreen: true,
                    backgroundThrottling: false
                }
            });

            // Load SVG in window
            await win.loadFile(svgPath);

            // Wait for rendering
            console.log('Rendering SVG...');
            await new Promise(r => setTimeout(r, 1000));

            // Capture page
            const image = await win.webContents.capturePage();

            if (image.isEmpty()) {
                console.error('Error: Captured image is empty');
                app.exit(1);
                return;
            }

            // 1. Save PNG (256x256)
            const png256 = image.resize({ width: 256, height: 256 }).toPNG();
            fs.writeFileSync(pngPath, png256);
            console.log('Created public/icon.png');

            // 2. Save ICO
            // Create temp files for different sizes
            const sizes = [256, 48, 32];
            const tempFiles = sizes.map(size => {
                const tempFile = path.join(__dirname, `temp_${size}.png`);
                const resized = image.resize({ width: size, height: size }).toPNG();
                fs.writeFileSync(tempFile, resized);
                return tempFile;
            });

            console.log('Generating ICO...');
            try {
                const icoBuf = await pngToIco(tempFiles);
                fs.writeFileSync(icoPath, icoBuf);
                console.log('Created public/icon.ico');
            } catch (e) {
                console.error('Error creating ICO:', e);
            }

            // Cleanup temp files
            tempFiles.forEach(f => {
                if (fs.existsSync(f)) fs.unlinkSync(f);
            });

            console.log('Done!');
            app.quit();
        } catch (err) {
            console.error('Fatal error:', err);
            app.exit(1);
        }
    });
}
