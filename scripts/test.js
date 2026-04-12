const fs = require('fs');
try {
  fs.writeFileSync('c:\\Users\\huzai\\Islamic-Kids-Learning-Platform\\test_output.log', 'Hello world absolute path');
  console.log('Success');
} catch (e) {
  console.error(e);
}
