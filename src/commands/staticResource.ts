// var gulp = require('gulp');
// var fs = require("fs-extra");
// var jsforce = require('jsforce');
// var jszip = require("jszip");
// var config = require('./jsforce.config');
// var exec = require('child_process').exec;

// var root = './resource-bundles/dbaseLib.resource';


// /**
//  * @func bundle
//  * The zip file is written to the static resource directory
//  * @param none
//  * @return undefined
//  */
// gulp.task('bundle-resource', function () {
//     console.log('Begin making static resource file(s).');
//     //generate files then make a zip object with them
//     var zip = zipFiles(getFileList(root));

//     var buffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
//     // Copy the zip to the StaticResource folder
//     fs.writeFile('./src/staticresources/dbaseLib.resource', buffer, 'binary');

// });

// gulp.task('default', ['bundle-and-deploy']);
// gulp.task('bundle-and-deploy', ['bundle-resource', 'deploy']);
// gulp.task('watch-and-bundle', function () {
//     gulp.watch(root + '/**/*.js', { interval: 1000 }, ['bundle']);
// });
// gulp.task('auto-deploy', function () {
//     gulp.watch([root + '/**/*.js', root + '/**/*.html', root + '/**/*.css'], { interval: 1000 }, ['deploy', 'refresh-browser']);
// });
// gulp.task('refresh-browser', function () {
//     exec('osascript -e \'tell app "Google Chrome" to tell the active tab of its first window to reload\'');
// });

// /**
//  * @func deploy
//  * The zip file is zipped and deployed 
//  * @param none
//  * @return undefined
//  */
// gulp.task('deploy', function () {
//     console.log('beginning salesforce update');

//     //generate files then make a zip object with them
//     var zip = zipFiles(getFileList(root));

//     //generate zip file
//     var zipFile = zip.generate({ base64: true, compression: 'DEFLATE' });

//     console.log('deployToSF is firing connection');
//     //connnect to SalesForce using jsforce
//     var conn = new jsforce.Connection({ loginUrl: 'https://login.salesforce.com' });

//     console.log('deployToSF is logging in');

//     conn.login(config.username, config.password)
//         .then(function () {
//             var metadata = makeResourceMetadata('dbaseLib', zipFile);
//             return conn.metadata.update('StaticResource', metadata);
//         })
//         .then(logSuccessResponse).then(function (res) {
//             console.log('deployToSF is firing response check.', res);
//             if (res.details && res.details.componentFailures) {
//                 console.error(res.details.componentFailures);
//             }
//         }, function (err) {
//             console.error(err);
//         });
// });


// function getFileList(relativeRoot) {
//     //throw if not a directory
//     if (!fs.lstatSync(relativeRoot).isDirectory()) {
//         throw new Error("");
//     }

//     //we trap the relative root in a closure then
//     //perform the recursive file search
//     return (function innerGetFileList(localPath) {
//         var fileslist = []; //list of files
//         var files = fs.readdirSync(localPath);//files in current directory

//         files.forEach(function (file) {
//             var pathname = localPath + "/" + file;
//             var stat = fs.lstatSync(pathname);

//             //if file is a directory, recursively add it's children
//             if (stat.isDirectory()) {
//                 fileslist = fileslist.concat(innerGetFileList(pathname));
//                 //otherwise, add the file to the file list
//             } else {
//                 fileslist.push(pathname.replace(relativeRoot + "/", ""));
//             }
//         });
//         return fileslist;
//     } (relativeRoot));
// };

// function zipFiles(fileList) {
//     if (!Array.isArray(fileList)) {
//         throw new Error("No files to zip. paramType: " + typeof fileList + '\n', fileList);
//     }

//     var zip = new jszip();

//     //add files to zip object
//     fileList.forEach(function (file) {
//         var content = fs.readFileSync(root + "/" + file);
//         zip.file(file, content);
//     });

//     return zip;
// };

// function makeResourceMetadata(bundleName, zipFile) {
//     return [{
//         fullName: bundleName,
//         description: 'spa data files',
//         content: zipFile,
//         contentType: 'application/zip',
//         cacheControl: 'Private'
//     }];
// };

// function logSuccessResponse(results) {
//     //   exec('osascript -e \'tell app "Google Chrome" to tell the active tab of its first window to reload\'');
//     console.log('results are: ', results);
//     console.log('success: ' + results.success);
//     console.log('created: ' + results.created);
//     console.log('fullName: ' + results.fullName);
//     return results;
// };
