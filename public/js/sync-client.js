/**
 * Created by xiaohe on 2016/12/9.
 * client functions for web-sync
 */

// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great success! All the File APIs are supported.
    console.log("Great success! All the File APIs are supported.")
} else {
    alert('The File APIs are not fully supported in this browser.');
}

var lock = true;
var current_file = null;
var block_size =  64 *1024;
var chunkSize  =  1024 * 1024 * 1024; // bytes
var timetamp;
var checksum_timetamp;
var test_start_time = (new Date()).getTime();
var traffic;

var test_hash_average = 0;
var test_hash_times = 0;

var socket = io.connect('http://'+window.location.hostname+':8001');
socket.on('matchdoc',function(req){
    traffic += req.matchdoc.byteLength;
    console.log("<<receive matchdoc of ",req.filename);
    checksum_timetamp = new Date();
    createPatchBlocks(req.matchdoc);
});
socket.on('SyncOver',function(req){
    lock = true;
    current_file = null;
    console.log('<<receive sync success');
    d = new Date();
    t = d.getTime() - timetamp.getTime();
    $("#result").text("同步成功！时间："+t+"ms / "+traffic+" b");
    console.info('all traffic is',traffic,'b');

    setTimeout(stop_test(),200);
})
function appendBlock( buffer, block) {
    var tmp = new Uint8Array( buffer.byteLength + block.byteLength);
    tmp.set( new Uint8Array( buffer ), 0 );
    tmp.set( block, buffer.byteLength );
    return tmp.buffer;
}
/*
 * get patch blocks
 * 4 bytes - blocksize
 * 4 bytes - patch blocks size
 * for each block
 *  4 bytes - block index
 *  4 bytes - n size
 *  n bytes - file content
 */
function createPatchBlocks(matchdoc){
    if(!current_file){
        console.log('current file is null!');
        return;
    }
    match_table = BSync.parseMatchDocument(matchdoc);
    var block_index = 1;

    var numChunk = Math.ceil(current_file.size/chunkSize);


    parseFile(current_file,function(type,data,start,stop){
        var patchdoc = new ArrayBuffer(1000);
        var patchsize = 1000;
        var patchdoc32View = new Uint32Array(patchdoc);
        var patchdoc8View = new Uint8Array(patchdoc);
        var numPatch = 0;
        patchdoc32View[0] = block_size;
        patchdoc32View[1] = numPatch;
        var doc_offset = 2*4;
        var data_offset = 0;

        var data8View = new Uint8Array(data);
        var numBlocks = Math.ceil(data.byteLength / block_size);
        for(i=0; i < numBlocks; i++){
            if(match_table[block_index] >= 0){
                data_offset += block_size;
            }
            else{
                if(patchsize < doc_offset+block_size + 4*2){
                    patchdoc = appendBlock(patchdoc,new ArrayBuffer(patchsize+block_size));
                    patchdoc32View = new Uint32Array(patchdoc);
                    patchdoc8View = new Uint8Array(patchdoc);
                    patchsize += patchsize + block_size;
                }
                //not match save into patch
                numPatch++;
                patchdoc32View[doc_offset/4] = block_index;
                doc_offset+=4;
                var current_blocksize = block_size;
                if(data.byteLength - data_offset < block_size){
                    current_blocksize = data.byteLength - data_offset;
                }
                patchdoc32View[doc_offset/4] = current_blocksize;
                doc_offset+=4;
                for(j = 0; j < current_blocksize;j++){
                    patchdoc8View[doc_offset] = data8View[data_offset+j];
                    doc_offset++;
                }
                data_offset += current_blocksize;
                //if doc_offset is not 4-times
                doc_offset  = Math.ceil(doc_offset/4)*4;

            }
            block_index++;
        }
        patchdoc32View[1] = numPatch;
        var d = new Date();
        var t = d.getTime() - checksum_timetamp.getTime();
        console.info(current_file.name,'patchdoc time is',t,'ms');
        console.log('patchdoc from',start,'to',stop,':',doc_offset,current_file.size);

        //emit the patchdoc
        traffic += doc_offset;
        socket.emit('patchdoc', {'filename':current_file.name,'patchdoc':patchdoc.slice(0,doc_offset),'numChunk':numChunk});
    })

}

/*
 * parse file
 */
function parseFile(file, callback) {
    var fileSize   = file.size;

    var offset     = 0;
    var self       = this; // we need a reference to the current object
    var chunkReaderBlock = null;

    var readEventHandler = function(evt) {
        if (evt.target.error == null) {
            var start = offset
            offset += evt.target.result.byteLength;
            var stop = offset
            callback('data',evt.target.result,start,stop); // callback for handling read chunk

        } else {
            console.log("Read error: " + evt.target.error);
            return;
        }
        if (offset >= fileSize) {
            // console.log("Done reading file");
            return;
        }
        chunkReaderBlock(offset, chunkSize, file);
    }

    chunkReaderBlock = function(_offset, length, _file) {
        var r = new FileReader();
        var start = _offset;
        var stop = start + length;
        if(stop > _file.size) stop = _file.size;
        if (file.webkitSlice) {
            var blob = file.webkitSlice(start, stop);
        } else if (file.mozSlice) {
            var blob = file.mozSlice(start, stop );
        }else if(file.slice) {
            blob = file.slice(start, stop);
        }
        r.onloadend = readEventHandler;
        r.readAsArrayBuffer(blob);
    }

    // now let's start the read with the first block
    chunkReaderBlock(offset, chunkSize, file);
}
/*
 * load blocks from file
 * @param: block_size : bytes
 */
function load_blocks() {
    // block_size = blockSize;
    if(lock) {
        lock = false;
        traffic = 0;
        $("#result").text("同步开始");
        timetamp = new Date();
    }

    else{
        console.log('wait for lock of parsing file');
        return;
    }

    var files = document.getElementById('files').files;
    if (!files.length) {
        alert('Please select a file!');
        return;
    }
    current_file = files[0];

    var all_numBlocks = Math.ceil(current_file.size / block_size);
    var i=0;
    var all_docLength =
        4 +         //4 bytes for block size
        4 +         //4 bytes for the number of blocks
            4 +     // 4 bytes for bytelength
        ( all_numBlocks * //the number of blocks times
            ( 4 +        //the 4 bytes for the adler32 plus
            16)    //the 16 bytes for the md5
        )
    var all_checksumdoc = new ArrayBuffer(all_docLength);
    var all_docview = new Uint32Array(all_checksumdoc);
    all_docview[0] = block_size;
    all_docview[1] = all_numBlocks;
    all_bytelength = 0;
    var doc_offset = 3;
    parseFile(current_file,function(type,data,start,stop){
        var checksumstart = new Date().getTime();
        checksumdoc = BSync.createChecksumDocument(block_size,data);
        var docView = new Uint32Array(checksumdoc);
        numBlocks = docView[1];
        all_bytelength += docView[2];
        for(i = 0; i < numBlocks*(1+4);i++){
            all_docview[doc_offset + i] = docView[i+3];
        }
        doc_offset += numBlocks*(1+4);

        console.log('checksum from',start,'to',stop,':',doc_offset,"/",all_docLength/4);

        if(doc_offset == all_docLength/4){
            all_docview[2] = all_bytelength;
            console.log('all checksum length is ',all_docLength);
            console.log('>>emit checksum doc',all_docLength);
            traffic += all_checksumdoc.byteLength;
            d = new Date();
            t = d.getTime() - checksumstart;
            console.log('checksum time is',t,'ms');
            checksum_timetamp = d;
            socket.emit('checksumdoc', {'filename':current_file.name,'checksumdoc':all_checksumdoc});
            // lock = true;

            test_hash_average += t;
            test_hash_times ++;
            console.log('average time is',test_hash_average/test_hash_times,'ms');

        }
    })
}
var test_handler = null;
var sync_handler = null;
var test_time = 0;
function test(){
    d = new Date();
    test_time = d.getTime() - test_start_time;
    console.info(test_time);
}
function start_test(){

    test_start_time = (new Date()).getTime();
    if(!test_handler){
        console.log('start_test');
        test_handler = setInterval(function(){ test(); }, 100);
        sync_handler = setTimeout(load_blocks,200);
    }else{
        clearInterval(test_handler);
        test_handler = null;
        sync_handler = null;
        console.log('stop_test');
    }
}

function stop_test(){
    if(test_handler){
        clearInterval(test_handler);
        test_handler = null;
        sync_handler = null;
        console.log('stop_test');
    }
}
