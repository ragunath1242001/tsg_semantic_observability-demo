<script setup lang="ts">
import QRCode from "qrcode";
import { onMounted, ref } from "vue";

const appstoreUrl = ref<string>("");
const playstoreUrl = ref<string>("");

const createQRWithLogo = async (url: string, logoPath: string) => {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, url, {
    width: 256,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF"
    },
    errorCorrectionLevel: "H"
  });

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL();

  return new Promise<string>((resolve, _reject) => {
    const img = new Image();
    img.onload = () => {
      const logoSize = 40;
      const x = (canvas.width - logoSize) / 2;
      const y = (canvas.height - logoSize) / 2;

      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        logoSize / 2 + 4,
        0,
        2 * Math.PI
      );
      ctx.fill();

      ctx.drawImage(img, x, y, logoSize, logoSize);
      resolve(canvas.toDataURL());
    };
    img.onerror = () => {
      resolve(canvas.toDataURL());
    };
    img.src = logoPath;
  });
};

const tsgLogo = "/images/applogodark.png";

onMounted(async () => {
  try {
    appstoreUrl.value = await createQRWithLogo(
      "https://apps.apple.com/us/app/tsg-mobile-wallet/id6741323068",
      tsgLogo
    );

    playstoreUrl.value = await createQRWithLogo(
      "https://play.google.com/store/apps/details?id=nl.tsg.mobilewallet",
      tsgLogo
    );
  } catch (error) {
    console.error(
      "Error generating QR codes with logo, falling back to plain QR codes.",
      error
    );
    appstoreUrl.value = await QRCode.toDataURL(
      "https://apps.apple.com/us/app/tsg-mobile-wallet/id6741323068"
    );
    playstoreUrl.value = await QRCode.toDataURL(
      "https://play.google.com/store/apps/details?id=nl.tsg.mobilewallet"
    );
  }
});
</script>
<template>
  <Card
    class="mt-8 shadow-xl rounded-xl border-0 bg-gradient-to-b from-white to-gray-50">
    <template #title>
      <div class="text-center px-6 py-4">
        <h2 class="text-3xl font-bold text-gray-800 mb-2">
          Download TSG Mobile Wallet
        </h2>
        <p class="text-lg text-gray-600">
          Get the app on your mobile device by scanning the QR code
        </p>
      </div>
    </template>
    <template #content>
      <div
        class="flex flex-col lg:flex-row justify-center items-center gap-16 px-8 py-8">
        <!-- App Store Section -->
        <div class="flex flex-col items-center space-y-4 group">
          <img
            :src="appstoreUrl"
            alt="QR Code for TSG Wallet on Apple App Store"
            class="w-56 h-56 rounded-2xl border-2 border-gray-200 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl" />
          <div class="text-center space-y-2">
            <h3
              class="text-xl font-semibold text-gray-800 flex items-center gap-2 justify-center">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              App Store
            </h3>
            <p class="text-gray-500">Scan with your iPhone</p>
            <a
              href="https://apps.apple.com/us/app/tsg-mobile-wallet/id6741323068"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg font-medium transition-all duration-200 hover:bg-gray-800 hover:scale-105 shadow-md">
              <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Download
            </a>
          </div>
        </div>

        <!-- Divider -->
        <div
          class="hidden lg:block w-px h-64 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
        <div
          class="lg:hidden w-64 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

        <!-- Google Play Section -->
        <div class="flex flex-col items-center space-y-4 group">
          <img
            :src="playstoreUrl"
            alt="QR Code for TSG Wallet on Google Play Store"
            class="w-56 h-56 rounded-2xl border-2 border-gray-200 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl" />
          <div class="text-center space-y-2">
            <h3
              class="text-xl font-semibold text-gray-800 flex items-center gap-2 justify-center">
              <svg
                class="w-6 h-6 text-green-500"
                viewBox="0 0 24 24"
                fill="currentColor">
                <path
                  d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              Google Play
            </h3>
            <p class="text-gray-500">Scan with your Android device</p>
            <a
              href="https://play.google.com/store/apps/details?id=nl.tsg.mobilewallet"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-green-700 hover:scale-105 shadow-md">
              <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              Download
            </a>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>
