# JCO Email Builder Staging

This folder is a self-contained staging environment for the JCO Marketo email builder.

## Files

- `index.html` is the builder page to place in Umbraco.
- `css/styles.css` contains only the builder UI styles.
- `js/builder.js` contains the module definitions and generated email markup.

## Notes

- The generated email HTML does not include the builder page CSS, JavaScript, `data-*` attributes, or asterisk instruction comments.
- Configurable links automatically receive the JCO tracking query string with the Marketo `unique-id` token and MD5 token.
- Fixed Marketo tokens such as `{{system.viewAsWebpageLink}}`, `{{my.728x90-TOP}}`, and lead tokens are preserved in the output.
- Open `index.html` directly in a browser for staging, or copy the full folder into the Umbraco Cloud media/template area you plan to use.
