const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "android/**",
      "www/**/*.min.js"
    ]
  },

  js.configs.recommended,

  // Browser ES Modules
  {
    files: ["www/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser
    }
  },

  // Node/CommonJS
  {
    files: [
      "server.js",
      "check-braces.js",
      "eslint.config.js"
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: globals.node
    }
  },
  // Browser (Capacitor)
{
    files: ["www/**/*.js"],
    languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        globals: globals.browser
    }
},

// Node.js
{
    files: [
        "www/server.js",
        "check-braces.js",
        "eslint.config.js"
    ],
    languageOptions: {
        ecmaVersion: "latest",
        sourceType: "commonjs",
        globals: globals.node
    }
}
];
