const str = '{"test": "<script>"}';
console.log(JSON.parse(str.replace(/"/g, '\\u0022')));
