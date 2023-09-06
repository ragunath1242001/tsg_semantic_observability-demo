const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  devServer: {
    proxy: {
      "^/api": {
        target: "https://wallet.alpha.scsn.dataspac.es/",
        // pathRewrite: { "^/api": "" },
      },
    },
  },
  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: [
            // 'vue-style-loader',
            // 'css-loader',
            'sass-loader'
          ]
        }
      ]
    }
  }
});
