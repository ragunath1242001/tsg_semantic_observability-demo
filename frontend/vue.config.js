const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  devServer: {
    proxy: {
      "^/api": {
        // target: "https://wallet.alpha.scsn.dataspac.es/",
        target: "http://localhost:3000/",
        pathRewrite: { "^/api": "" },
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
