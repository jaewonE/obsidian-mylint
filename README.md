# myLint

myLint is an Obsidian plugin that reformats Markdown files according to a few custom rules. It helps keep notes consistent by normalising LaTeX delimiters and cleaning up heading and list spacing. YAML frontmatter and fenced code blocks are left untouched.

## Features

- Convert LaTeX math delimiters
  - `\( contents \)` → `$contents$`
  - `\[ contents \]` → `$$contents$$`
- Ensure a blank line above and below every heading
- Remove superfluous blank lines between list items
- Collapse multiple blank lines elsewhere into a single blank line
- Preserve YAML frontmatter and fenced code blocks

## Usage

1. Open a Markdown file in your vault.
2. Click the **Apply myLint** button (checkmark icon) in the left ribbon.
3. The active file will be rewritten with the rules above.

The plugin also provides a settings tab describing the lint rules.

## Installation

### From Obsidian

The plugin is not yet listed in the community plugin browser. You can build it yourself and copy the files to your vault.

### Manual

1. Download `main.js`, `manifest.json` and `styles.css` from the latest release.
2. Create a folder inside your vault at `.obsidian/plugins/my-lint`.
3. Place the downloaded files in that folder and reload Obsidian.

## Development

1. Install Node.js 16 or newer.
2. Run `npm i` to install dependencies.
3. `npm run dev` will build the plugin in watch mode.
4. `npm run build` will create an optimised build for release.

## License

This project is licensed under the GNU General Public License version 3.0.
