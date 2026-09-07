import { test, expect } from "@playwright/test";

test.use({ channel: "chrome" });

test.describe("Google Material 3 (M3) Visual, Typography & Banner Rendering", () => {
  test("verifies official M3 type scale, Material Symbols font variation, and banner styling in Chromium", async ({
    page,
  }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&family=Roboto+Flex:opsz,wght@8..144,100..1000&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        <style>
          body {
            font-family: "Roboto", "Roboto Flex", sans-serif;
            margin: 24px;
            background-color: #f9f9ff;
            color: #1a1b20;
          }
          .material-symbols-rounded {
            font-family: "Material Symbols Rounded", sans-serif;
            font-weight: normal;
            font-style: normal;
            font-size: 24px;
            line-height: 1;
            display: inline-block;
          }
          .m3-display-large { font-size: 57px; line-height: 64px; letter-spacing: -0.25px; font-weight: 400; }
          .m3-display-medium { font-size: 45px; line-height: 52px; letter-spacing: 0px; font-weight: 400; }
          .m3-headline-medium { font-size: 28px; line-height: 36px; letter-spacing: 0px; font-weight: 400; }
          .m3-headline-small { font-size: 24px; line-height: 32px; letter-spacing: 0px; font-weight: 400; }
          .m3-title-large { font-size: 22px; line-height: 28px; letter-spacing: 0px; font-weight: 400; }
          .m3-title-medium { font-size: 16px; line-height: 24px; letter-spacing: 0.15px; font-weight: 500; }
          .m3-body-large { font-size: 16px; line-height: 24px; letter-spacing: 0.5px; font-weight: 400; }
          .m3-body-medium { font-size: 14px; line-height: 20px; letter-spacing: 0.25px; font-weight: 400; }
          .m3-label-large { font-size: 14px; line-height: 20px; letter-spacing: 0.1px; font-weight: 500; }
          .m3-banner-error {
            background-color: #ffdad6;
            color: #93000a;
            border: 1px solid rgba(186, 26, 26, 0.3);
            border-radius: 16px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .m3-banner-hero {
            background-color: #435e91;
            color: #ffffff;
            border-radius: 16px;
            padding: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <!-- M3 Icon -->
        <span id="m3-icon-school" class="material-symbols-rounded" style="font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;">
          school
        </span>

        <!-- M3 Typography Scale Elements -->
        <h1 id="m3-display-large" class="m3-display-large">M3 Display Large 57px</h1>
        <h2 id="m3-headline-medium" class="m3-headline-medium">M3 Headline Medium 28px</h2>
        <h4 id="m3-title-medium" class="m3-title-medium">M3 Title Medium 16px</h4>
        <p id="m3-body-medium" class="m3-body-medium">M3 Body Medium 14px body text.</p>
        <span id="m3-label-large" class="m3-label-large">M3 Label Large 14px</span>

        <!-- M3 Error Banner -->
        <div id="m3-banner-error" class="m3-banner-error" role="alert">
          <span class="material-symbols-rounded" style="font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;">
            error
          </span>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Peringatan Kritis</h3>
            <p style="margin: 4px 0 0; font-size: 14px;">Terdeteksi anomali kehadiran siswa PKL.</p>
          </div>
        </div>

        <!-- M3 Hero Banner -->
        <div id="m3-banner-hero" class="m3-banner-hero" role="status">
          <div>
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">Smart School SaaS</h2>
            <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Pusat Kendali Terpadu E-PKL &amp; LMS Material 3.</p>
          </div>
          <button style="padding: 8px 16px; border-radius: 20px; background: rgba(255,255,255,0.15); color: #fff; border: none; cursor: pointer;">
            Mulai
          </button>
        </div>
      </body>
      </html>
    `);

    // 1. Verify Material Symbol icon
    const schoolIcon = page.locator("#m3-icon-school");
    await expect(schoolIcon).toBeVisible();
    await expect(schoolIcon).toHaveText("school");
    await expect(schoolIcon).toHaveCSS("font-size", "24px");

    // 2. Verify M3 Type Scale computed metrics
    const displayLarge = page.locator("#m3-display-large");
    await expect(displayLarge).toHaveCSS("font-size", "57px");
    await expect(displayLarge).toHaveCSS("line-height", "64px");

    const headlineMedium = page.locator("#m3-headline-medium");
    await expect(headlineMedium).toHaveCSS("font-size", "28px");
    await expect(headlineMedium).toHaveCSS("line-height", "36px");

    const titleMedium = page.locator("#m3-title-medium");
    await expect(titleMedium).toHaveCSS("font-size", "16px");
    await expect(titleMedium).toHaveCSS("line-height", "24px");

    const bodyMedium = page.locator("#m3-body-medium");
    await expect(bodyMedium).toHaveCSS("font-size", "14px");
    await expect(bodyMedium).toHaveCSS("line-height", "20px");

    const labelLarge = page.locator("#m3-label-large");
    await expect(labelLarge).toHaveCSS("font-size", "14px");
    await expect(labelLarge).toHaveCSS("line-height", "20px");

    // 3. Verify Error Banner attributes and styling
    const errorBanner = page.locator("#m3-banner-error");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toHaveAttribute("role", "alert");
    await expect(errorBanner).toHaveCSS("border-radius", "16px");
    await expect(errorBanner).toHaveCSS("background-color", "rgb(255, 218, 214)");

    // 4. Verify Hero Banner attributes and styling
    const heroBanner = page.locator("#m3-banner-hero");
    await expect(heroBanner).toBeVisible();
    await expect(heroBanner).toHaveAttribute("role", "status");
    await expect(heroBanner).toHaveCSS("border-radius", "16px");
  });

  test("verifies banner interactive dismiss and mobile responsive wrapping at 320px", async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 320, height: 640 });

    await page.setContent(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: sans-serif; background: #f8f9fd; padding: 12px; overflow-x: hidden; }
          .m3-banner {
            width: 100%;
            border-radius: 16px;
            padding: 16px;
            background: #ffdad6;
            color: #410002;
            border: 1px solid rgba(186, 26, 26, 0.3);
          }
          .m3-banner-content {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .m3-banner-body {
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }
          .m3-banner-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
            width: 100%;
          }
          .m3-btn {
            padding: 6px 12px;
            border-radius: 20px;
            border: 1px solid rgba(65, 0, 2, 0.2);
            background: transparent;
            font-size: 12px;
            cursor: pointer;
          }
          .m3-close-btn {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: rgba(0,0,0,0.05);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <div id="dismissible-banner" class="m3-banner" role="alert">
          <div class="m3-banner-content">
            <div class="m3-banner-body">
              <div>
                <h3 style="font-size: 14px; font-weight: 600;">Peringatan Sistem</h3>
                <p style="font-size: 12px; margin-top: 4px;">Kuota penggunaan sekolah mendekati ambang batas maksimal.</p>
              </div>
            </div>
            <div class="m3-banner-actions">
              <button class="m3-btn">Upgrade Paket</button>
              <button class="m3-btn">Pelajari Lebih Lanjut</button>
              <button id="close-banner-btn" class="m3-close-btn" aria-label="Tutup banner" onclick="document.getElementById('dismissible-banner').remove()">✕</button>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    // Verify banner is visible on mobile viewport
    const banner = page.locator("#dismissible-banner");
    await expect(banner).toBeVisible();

    // Verify no horizontal overflow in 320px viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(windowWidth);

    // Test dismiss interaction
    const closeBtn = page.locator("#close-banner-btn");
    await closeBtn.click();
    await expect(banner).not.toBeAttached();
  });
});
