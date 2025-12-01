
try {
    const resolve = require('./api/resolve.js');
    console.log("Module loaded successfully");
    console.log("Type of export:", typeof resolve);
    if (resolve.default) {
        console.log("Has default export");
    }
} catch (e) {
    console.error("Error loading module:", e.message);
}
