var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require("fs");
var OSS = require('ali-oss');
var co = require('co');
var client = new OSS({
    region: 'oss-cn-shanghai',
    accessKeyId: 'LTAIiTUIWMffMbLD',
    accessKeySecret: 'Ykcf2pSp3uTP9IKCqqRHzJXMgDwQzC',
    bucket:'xiaohe-websync',
    internal:true,
    endpoint:'oss-cn-shanghai-internal.aliyuncs.com',
});

var index = require('./routes/index');
var users = require('./routes/users');
var BSync = require('./public/js/bit-sync');
var arrayBufferToBuffer = require('arraybuffer-to-buffer');

var stream = require('stream');
var streamToBuffer = require('stream-to-buffer')


var basePath = __dirname + "/upload/";

var app = express();

var server = require('http').Server(app);
var io = require('socket.io')(server);

var direct_stream = false;

server.listen(8001);

/* match_cache = [filename1:(1234 bytes,matchdoc],
    }
 */
var match_cache = {};
var patch_cache = {};
var patch_num_cache = {};

var origin_file_cache = {};

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

io.on('connection', function(socket)
{
  console.log('new connect!');
  socket.on('checksumdoc', function(req)
  {
       
      console.log('got checksumdoc of filename:',req.filename);
      filePath = basePath + req.filename;

      checksumdocView = new Uint8Array(req.checksumdoc);
      checksumdocBuffer = checksumdocView.buffer;

      if(direct_stream){
          co(function * () {
              client.useBucket('xiaohe-websync');
              var result = yield client.getStream(req.filename);
              streamToBuffer(result.stream, function (err, buffer) {
                  origin_file_cache[req.filename] = buffer
                  matchret = BSync.createMatchDocument(checksumdocBuffer,buffer);
                  matchdoc = matchret[0];
                  filebytelength = matchret[1];
                  match_cache[req.filename] = [filebytelength,matchdoc];
                  socket.emit('matchdoc',{filename:req.filename,matchdoc:matchdoc});
              })
          }).catch(function (err) {
              console.log(err);
              origin_file_cache[req.filename] = new ArrayBuffer(0);
              matchret = BSync.createMatchDocument(checksumdocBuffer,new ArrayBuffer(0));
              matchdoc = matchret[0];
              filebytelength = matchret[1];
              match_cache[req.filename] = [filebytelength,matchdoc];
              socket.emit('matchdoc',{filename:req.filename,matchdoc:matchdoc});
          });
      }else{
          fs.stat(filePath, function (err,stat) {

              if (err == null) {
                  getFileData(filePath,function(data){
                      origin_file_cache[req.filename] = data
                      matchret = BSync.createMatchDocument(checksumdocBuffer,data);
                      matchdoc = matchret[0];
                      filebytelength = matchret[1];
                      match_cache[req.filename] = [filebytelength,matchdoc];
                      socket.emit('matchdoc',{filename:req.filename,matchdoc:matchdoc});
                  })
              } else {
                  origin_file_cache[req.filename] = new ArrayBuffer(0);
                  matchret = BSync.createMatchDocument(checksumdocBuffer,new ArrayBuffer(0));
                  matchdoc = matchret[0];
                  filebytelength = matchret[1];
                  match_cache[req.filename] = [filebytelength,matchdoc];
                  socket.emit('matchdoc',{filename:req.filename,matchdoc:matchdoc});
              }
          });
      }
  });

    socket.on('patchdoc',function(req){
        console.log('patchdoc of',req.filename);

        //todo combine patch doc and matched blocks
        var matchdoc = match_cache[req.filename][1];
        var filebytelength = match_cache[req.filename][0];
        var matchtable = BSync.parseMatchDocument(matchdoc);
        filePath = basePath + req.filename;
        var newFilebuffer = new ArrayBuffer(filebytelength);
        var file8View = new Uint8Array(newFilebuffer);
        if(!patch_cache[req.filename]) {
            patch_cache[req.filename] = {};
            patch_num_cache[req.filename] = 0;
        }

        parsePatchDoc(req.filename,req.patchdoc,function(blocksize){
            if(patch_num_cache[req.filename] == req.numChunk){
                data = origin_file_cache[req.filename];
                var data8View = new Uint8Array(data);
                numBlocks = Math.ceil(filebytelength/blocksize);
                dataoffset = 0;
                for(i = 1; i <= numBlocks;i++){
                    //i is blockindex
                    if(matchtable[i] >= 0){
                        matchoffset = matchtable[i];
                        // for(j = 0;j < blocksize && (j+matchoffset) < data.length;j++){
                        //     file8View[dataoffset++] = data8View[matchoffset+j];
                        // }
                        var b_size = Math.min(blocksize,data.length - matchoffset);
                        file8View.set(data8View.slice(matchoffset,matchoffset+b_size),dataoffset);
                        dataoffset += b_size;
                    }else{
                        blockcontent = patch_cache[req.filename][i];
                        block8View = new Uint8Array(blockcontent);
                        // for(j = 0; j < blockcontent.byteLength;j++){
                        //     file8View[dataoffset++] = block8View[j];
                        // }
                        file8View.set(block8View,dataoffset);
                        dataoffset += block8View.length;

                    }
                }
                if(direct_stream){
                    co(function * () {
                        client.useBucket('xiaohe-websync');
                        var bufferStream = new stream.PassThrough();
                        bufferStream.end(arrayBufferToBuffer(newFilebuffer));
                        var result = yield client.putStream(req.filename,bufferStream);
                        if(result['res']['status'] == 200){
                            console.log('file write over~');
                            BlockSyncStatus = 'success';
                            socket.emit('SyncOver', BlockSyncStatus);
                            //reset cache
                            delete match_cache[req.filename]
                            delete patch_num_cache[req.filename]
                            delete patch_cache[req.filename]
                        }
                    }).catch(function (err) {
                        console.log(err);
                    });
                }else{
                    fs.writeFile(filePath,arrayBufferToBuffer(newFilebuffer),function(err){
                        if (err){
                            throw 'error writing file: ' + err;
                        }
                        else{
                            console.log('file write over~');
                            BlockSyncStatus = 'success';
                            socket.emit('SyncOver', BlockSyncStatus);

                            console.log('冲突:',BSync.hash16_coll);
                        }
                        //reset cache
                        delete match_cache[req.filename]
                        delete patch_num_cache[req.filename]
                        delete patch_cache[req.filename]
                    })
                }
            }
        });
    })
});
function parsePatchDoc(filename,patchdoc,callback){
    var patchdoc8View = new Uint8Array(patchdoc);
    var patchdoc32View = new Uint32Array(patchdoc8View.buffer);
    var patch_offset = 2;
    var blocksize = patchdoc32View[0];
    var numPatch = patchdoc32View[1];
    // var patchtable = {};
    for(i = 0; i < numPatch;i++){
        var blockindex = patchdoc32View[patch_offset];
        patch_offset++;
        var currentblocksize = patchdoc32View[patch_offset];
        patch_offset++;
        var filecontent = new ArrayBuffer(currentblocksize);
        var file8View = new Uint8Array(filecontent);
        for(j = 0;j < currentblocksize;j++){
            file8View[j] = patchdoc8View[patch_offset*4+j];
        }
        patch_offset += Math.ceil(j/4);
        patch_cache[filename][blockindex] = filecontent;
    }
    patch_num_cache[filename]++;
    callback(blocksize);
}

// 在服务器端读取文件
function getFileData(file, callback)
{
    fs.readFile(file, function(err, data) {
        if (err) {
            // console.error("Error getting file data: " + err);
        }
        callback(data);
    });
}


module.exports = app;
