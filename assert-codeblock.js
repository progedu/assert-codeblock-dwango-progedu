const AssertCodeblock = require('./dist/index');
const config = {
  src: "./sample_files/"
};

const textbook_filepath = `README.md`;
AssertCodeblock.inspect_codeblock(textbook_filepath, config) // true