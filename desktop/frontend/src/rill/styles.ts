import figmaCss from "./rill.css?inline";
import tokensCss from "./tokens.css?inline";

// The frozen Figma Make bundle is injected into a ShadowRoot so its preflight
// and utility selectors cannot mutate the legacy application stylesheet.
export const rillCss = `${figmaCss}\n${tokensCss}`;
