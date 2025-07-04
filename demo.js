const { createTwoFilesPatch } = require('diff');

const oldStr = `
127ach
12345
1231
1241111
`;

const newStr = `
127ach2
12345
123111
1241111
`;

const patch = createTwoFilesPatch("oldContent.txt", "newContent.txt", oldStr, newStr);

console.log(patch);