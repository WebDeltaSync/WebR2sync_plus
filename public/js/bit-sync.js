/**
 * bit-sync.js
 *
 * For more information see the readme.
 *
 * Source is located at https://github.com/claytongulick/bit-sync
 *
 * Licensed under the MIT License
 *
 * Copyright Clayton C. Gulick
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var MMHASH3;
if(!MMHASH3){
    MMHASH3 = require('./murmurhash3');
    SipHash = require('./siphash');
    var performance = Date;
}
var MOD_ADLER = 65521;

var BSync = new function()
{

    /******* Privates *********/
    //todo
    var md5_0 = function (message,seed,offset,chunksize) {
        message = message.slice(offset,offset+chunksize)
        // Convert to byte array
        if (message.constructor == String) message = UTF8.stringToBytes(message);
        /* else, assume byte array already */
        var bytesToWords = function (bytes) {
            for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8)
                words[b >>> 5] |= (bytes[i] & 0xFF) << (24 - b % 32);
            return words;
        }

        var m = bytesToWords(message),
            l = message.length * 8,
            a =  1732584193,
            b = -271733879,
            c = -1732584194,
            d =  271733878;

        // Swap endian
        for (var i = 0; i < m.length; i++) {
            m[i] = ((m[i] <<  8) | (m[i] >>> 24)) & 0x00FF00FF |
                ((m[i] << 24) | (m[i] >>>  8)) & 0xFF00FF00;
        }

        // Padding
        m[l >>> 5] |= 0x80 << (l % 32);
        m[(((l + 64) >>> 9) << 4) + 14] = l;

        // Method shortcuts
        // Auxiliary functions
        var FF  = function (a, b, c, d, x, s, t) {
            var n = a + (b & c | ~b & d) + (x >>> 0) + t;
            return ((n << s) | (n >>> (32 - s))) + b;
        };
        var GG  = function (a, b, c, d, x, s, t) {
            var n = a + (b & d | c & ~d) + (x >>> 0) + t;
            return ((n << s) | (n >>> (32 - s))) + b;
        };
        var HH  = function (a, b, c, d, x, s, t) {
            var n = a + (b ^ c ^ d) + (x >>> 0) + t;
            return ((n << s) | (n >>> (32 - s))) + b;
        };
        var II  = function (a, b, c, d, x, s, t) {
            var n = a + (c ^ (b | ~d)) + (x >>> 0) + t;
            return ((n << s) | (n >>> (32 - s))) + b;
        };

        for (var i = 0; i < m.length; i += 16) {

            var aa = a,
                bb = b,
                cc = c,
                dd = d;

            a = FF(a, b, c, d, m[i+ 0],  7, -680876936);
            d = FF(d, a, b, c, m[i+ 1], 12, -389564586);
            c = FF(c, d, a, b, m[i+ 2], 17,  606105819);
            b = FF(b, c, d, a, m[i+ 3], 22, -1044525330);
            a = FF(a, b, c, d, m[i+ 4],  7, -176418897);
            d = FF(d, a, b, c, m[i+ 5], 12,  1200080426);
            c = FF(c, d, a, b, m[i+ 6], 17, -1473231341);
            b = FF(b, c, d, a, m[i+ 7], 22, -45705983);
            a = FF(a, b, c, d, m[i+ 8],  7,  1770035416);
            d = FF(d, a, b, c, m[i+ 9], 12, -1958414417);
            c = FF(c, d, a, b, m[i+10], 17, -42063);
            b = FF(b, c, d, a, m[i+11], 22, -1990404162);
            a = FF(a, b, c, d, m[i+12],  7,  1804603682);
            d = FF(d, a, b, c, m[i+13], 12, -40341101);
            c = FF(c, d, a, b, m[i+14], 17, -1502002290);
            b = FF(b, c, d, a, m[i+15], 22,  1236535329);

            a = GG(a, b, c, d, m[i+ 1],  5, -165796510);
            d = GG(d, a, b, c, m[i+ 6],  9, -1069501632);
            c = GG(c, d, a, b, m[i+11], 14,  643717713);
            b = GG(b, c, d, a, m[i+ 0], 20, -373897302);
            a = GG(a, b, c, d, m[i+ 5],  5, -701558691);
            d = GG(d, a, b, c, m[i+10],  9,  38016083);
            c = GG(c, d, a, b, m[i+15], 14, -660478335);
            b = GG(b, c, d, a, m[i+ 4], 20, -405537848);
            a = GG(a, b, c, d, m[i+ 9],  5,  568446438);
            d = GG(d, a, b, c, m[i+14],  9, -1019803690);
            c = GG(c, d, a, b, m[i+ 3], 14, -187363961);
            b = GG(b, c, d, a, m[i+ 8], 20,  1163531501);
            a = GG(a, b, c, d, m[i+13],  5, -1444681467);
            d = GG(d, a, b, c, m[i+ 2],  9, -51403784);
            c = GG(c, d, a, b, m[i+ 7], 14,  1735328473);
            b = GG(b, c, d, a, m[i+12], 20, -1926607734);

            a = HH(a, b, c, d, m[i+ 5],  4, -378558);
            d = HH(d, a, b, c, m[i+ 8], 11, -2022574463);
            c = HH(c, d, a, b, m[i+11], 16,  1839030562);
            b = HH(b, c, d, a, m[i+14], 23, -35309556);
            a = HH(a, b, c, d, m[i+ 1],  4, -1530992060);
            d = HH(d, a, b, c, m[i+ 4], 11,  1272893353);
            c = HH(c, d, a, b, m[i+ 7], 16, -155497632);
            b = HH(b, c, d, a, m[i+10], 23, -1094730640);
            a = HH(a, b, c, d, m[i+13],  4,  681279174);
            d = HH(d, a, b, c, m[i+ 0], 11, -358537222);
            c = HH(c, d, a, b, m[i+ 3], 16, -722521979);
            b = HH(b, c, d, a, m[i+ 6], 23,  76029189);
            a = HH(a, b, c, d, m[i+ 9],  4, -640364487);
            d = HH(d, a, b, c, m[i+12], 11, -421815835);
            c = HH(c, d, a, b, m[i+15], 16,  530742520);
            b = HH(b, c, d, a, m[i+ 2], 23, -995338651);

            a = II(a, b, c, d, m[i+ 0],  6, -198630844);
            d = II(d, a, b, c, m[i+ 7], 10,  1126891415);
            c = II(c, d, a, b, m[i+14], 15, -1416354905);
            b = II(b, c, d, a, m[i+ 5], 21, -57434055);
            a = II(a, b, c, d, m[i+12],  6,  1700485571);
            d = II(d, a, b, c, m[i+ 3], 10, -1894986606);
            c = II(c, d, a, b, m[i+10], 15, -1051523);
            b = II(b, c, d, a, m[i+ 1], 21, -2054922799);
            a = II(a, b, c, d, m[i+ 8],  6,  1873313359);
            d = II(d, a, b, c, m[i+15], 10, -30611744);
            c = II(c, d, a, b, m[i+ 6], 15, -1560198380);
            b = II(b, c, d, a, m[i+13], 21,  1309151649);
            a = II(a, b, c, d, m[i+ 4],  6, -145523070);
            d = II(d, a, b, c, m[i+11], 10, -1120210379);
            c = II(c, d, a, b, m[i+ 2], 15,  718787259);
            b = II(b, c, d, a, m[i+ 9], 21, -343485551);

            a = (a + aa) >>> 0;
            b = (b + bb) >>> 0;
            c = (c + cc) >>> 0;
            d = (d + dd) >>> 0;

        }
        var rotl = function (n, b) {
            return (n << b) | (n >>> (32 - b));
        }
        var endian = function (n) {

            // If number given, swap endian
            if (n.constructor == Number) {
                return rotl(n,  8) & 0x00FF00FF |
                    rotl(n, 24) & 0xFF00FF00;
            }

            // Else, assume array and swap all items
            for (var i = 0; i < n.length; i++)
                n[i] = endian(n[i]);
            return n;

        }
        return new Uint32Array([a, b, c, d]);

    };

    var md5_1 = MMHASH3.lib.x86.hash128_arraybuffer;

    var md5 = function (message,seed,offset,chunksize) {
            var m = message.slice(offset,offset+chunksize);
            return SipHash.lib.hash(m);
        }



    /**
     * Create a fast 16 bit hash of a 32bit number. Just using a simple mod 2^16 for this for now.
     * TO: Evaluate the distribution of adler32 to see if simple modulus is appropriate as a hashing function, or wheter 2^16 should be replaced with a prime
     */
    function hash16(i)
    {
        // return num % 65536;
        var p =  1867;
        return ((i>>16)& 0xffff ^ ((i&0xffff) * p)) & 0xffff;
    }

    /**
     * Create a 32 bit checksum for the block, based on the adler-32 checksum, with M as 2^16
     * Used to feed the rollingChecksum function, so returns the broken out pieces that are required for fast calc (since there's no reason to do pointless
     * bit manipulation, we just cache the parts, like {a: ..., b: ..., checksum: ... }.
     *
     * Offset is the start, and end is the last byte for the block to be calculated. end - offset should equal the blockSize - 1
     *
     * Data should be a Uint8Array
     *
     * TDO: according to wikipedia, the zlib compression library has a much more efficient implementation of adler. To speed this up, it might be worth investigating whether that can be used here.
     */
    function adler32(offset, end, data)
    {

        var a = 1, b= 0;

        //adjust the end to make sure we don't exceed the extents of the data.
        if(end >= data.length)
            end = data.length - 1;

        for(i=offset; i <= end; i++)
        {
            a += data[i];
            b += a;
            a %= MOD_ADLER;
            b %= MOD_ADLER;
        }

        return {a: a>>>0, b: b>>>0, checksum: ((b << 16) | a) >>>0};

    }

    /**
     * Performs a very fast rolling checksum for incremental searching using Tridgell's modification of adler-32 for rolling checksum
     * Returns an object suitable for use in additional calls to rollingChecksum, same as the adler32 function. This needs to be called with an offset of at least 1!
     * It is the responsibility of the called to make sure we don't exceed the bounds of the data, i.e. end MUST be less than data.length
     */
    function rollingChecksum(adlerInfo, offset, end, data)
    {
        newdata = 0
        if(end < data.length)
            newdata = data[end]
        else
            end = data.length-1
        var temp = data[offset - 1]; //this is the first byte used in the previous iteration
        var a = ((adlerInfo.a - temp + newdata) % MOD_ADLER + MOD_ADLER)%MOD_ADLER;
        var b = ((adlerInfo.b - ((end - offset + 1) * temp) + a - 1) % MOD_ADLER + MOD_ADLER)%MOD_ADLER;
        return {a: a>>>0, b: b>>>0, checksum: ((b << 16) | a)>>>0};
    }

    /**
     * This is a function born of annoyance. You can't create a Uint32Array at a non 4 byte boundary. So this is necessary to read
     * a 32bit int from an arbitrary location. Lame.
     *
     * BTW: This assumes everything to be little endian.
     */
    function readInt32(uint8View, offset)
    {
        return (uint8View[offset] | uint8View[++offset] << 8 | uint8View[++offset] << 16 | uint8View[++offset] << 24) >>> 0;
    }

    /**
     * Create a document that contains all of the checksum information for each block in the destination data. Everything is little endian
     * Document structure:
     * First 4 bytes = block size
     * Next 4 bytes = number of blocks
     * 4 byes  = byte length of file
     * Repeat for number of blocks:
     *   4 bytes, adler32 checksum
     *   16 bytes, md5 checksum
     *
     */
    function createChecksumDocument(blockSize, data)
    {
        var filebytelength = data.byteLength;
        var numBlocks = Math.ceil(data.byteLength / blockSize);
        var i=0;
        var docLength = ( numBlocks * //the number of blocks times
        ( 4 +       //the 4 bytes for the adler32 plus
        16) +     //the 16 bytes for the md5
        4 +         //plus 4 bytes for block size
        4 + 4);         //plus 4 bytes for the number of blocks

        var doc = new ArrayBuffer(docLength);
        var dataView = new Uint8Array(data);
        var bufferView = new Uint32Array(doc);
        var offset = 3;
        var chunkSize = 5; //each chunk is 4 bytes for adler32 and 16 bytes for md5. for Uint32Array view, this is 20 bytes, or 5 4-byte uints

        bufferView[0] = blockSize;
        bufferView[1] = numBlocks;
        bufferView[2] = filebytelength;

        //spin through the data and create checksums for each block
        for(i=0; i < numBlocks; i++)
        {
            var start = i * blockSize;
            var end = (i * blockSize) + blockSize;

            //calculate the adler32 checksum
            bufferView[offset] = adler32(start, end - 1, dataView).checksum;
            offset++;

            //calculate the full md5 checksum
            var chunkLength = blockSize;
            if((start + blockSize) > data.byteLength)
                chunkLength = data.byteLength - start;


            var md5sum = md5(dataView,0,start,chunkLength);
            // var md5sum = [0,0,0,0]
            for(var j=0; j < 4; j++) bufferView[offset++] = md5sum[j];

        }

        return doc;

    }

    /**
     * Parse the checksum document into a hash table
     *
     * The hash table will have 2^16 entries. Each entry will point to an array that has the following strucutre:
     * [
     *  [ [blockIndex, adler32sum, md5sum],[blockIndex, adler32sum, md5sum],... ]
     *  [ [blockIndex, adler32sum, md5sum],[blockIndex, adler32sum, md5sum],... ]
     *  ...
     * ]
     */
    function parseChecksumDocument(checksumDocument)
    {
        var fplist =  [];
        var fp_chunk_size = 1*1024*1024;



        var ret = [];
        var linked_checksum = [];
        var i=0;
        var view = new Uint32Array(checksumDocument);
        var blockIndex = 1; //blockIndex is 1 based, not zero based
        var numBlocks = view[1];
        var filebytelength = view[2];
        var row;
        var hash;

        var fp_all_num = Math.ceil(filebytelength/fp_chunk_size);

        var offset  = 0;

        //each chunk in the document is 20 bytes long. 32 bit view indexes 4 bytes, so increment by 5.
        for(i = 3; i <= view.length - 5; i += 5)
        {
            checksumInfo = [
                blockIndex, //the index of the block
                view[i], //the adler32sum
                [view[i+1],view[i+2],view[i+3],view[i+4]] //the md5sum
            ];
            hash = hash16(checksumInfo[1]);
            if(!ret[hash]) ret[hash] = [];
            ret[hash].push(checksumInfo);
            linked_checksum[blockIndex] = [view[i+1],view[i+2],view[i+3],view[i+4]];
            blockIndex++;
        }

        if(numBlocks != (blockIndex - 1))
        {
            throw "Error parsing checksum document. Document states the number of blocks is: " + numBlocks + " however, " + blockIndex - 1 + " blocks were discovered";
        }
        return [filebytelength,ret,linked_checksum];

    }

    /**
     * create match document that contains all matched block index
     * 4 bytes - blockSize
     * 4 bytes - num of matched blocks
     * for each matched block
     *    4 bytes - the index of the matched block
     *    4 bytes - the offset in the old file
     */
    function createMatchDocument(checksumDocument, data){
        function appendBuffer( buffer1, buffer2 ) {
            var tmp = new Uint8Array( buffer1.byteLength + buffer2.byteLength );
            tmp.set( new Uint8Array( buffer1 ), 0 );
            tmp.set( new Uint8Array( buffer2 ), buffer1.byteLength );
            return tmp.buffer;
        }

        /**
         * First, check to see if there's a match on the 16 bit hash
         * Then, look through all the entries in the hashtable row for an adler 32 match.
         * Finally, do a strong md5 comparison
         */
        function checkMatch(adlerInfo, hashTable,start,chunksize, block)
        {
            var hash = hash16(adlerInfo.checksum);
            // return false;
            if(!(hashTable[hash])) {
                // console.log('adler 32 missing');
                return false;
            }
            // var testblock = block.slice(start,start+chunksize);

            var row = hashTable[hash];
            this.hash16_coll += row.length - 1;
            var i=0;
            var matchedIndex=0;

            for(i=0; i<row.length; i++)
            {
                //compare adler32sum
                if((row[i][1] & 0xffffffff) != adlerInfo.checksum) continue;
                //do strong comparison
                md5sum1 = md5(block,0,start,chunksize);
                // md5sum1 = MMHASH3.lib.x86.hash128_arraybuffer(testblock);
                // md5sum1 = new Uint32Array([md5sum1[0],md5sum1[1],md5sum1[2],md5sum1[3]]); //convert to unsigned 32
                md5sum2 = row[i][2];
                if(
                    md5sum1[0] == md5sum2[0] &&
                    md5sum1[1] == md5sum2[1] &&
                    md5sum1[2] == md5sum2[2] &&
                    md5sum1[3] == md5sum2[3]
                )
                    return row[i][0]; //match found, return the matched block index
            }

            return false;

        }

        var checksumDocumentView = new Uint32Array(checksumDocument);
        var blockSize = checksumDocumentView[0];
        var numBlocks = checksumDocumentView[1];
        var numPatches = 0;

        var patchDocument = new ArrayBuffer(8);
        var patch;
        var patches = new ArrayBuffer(0);
        var i=0;

        var checksumret = parseChecksumDocument(checksumDocument);
        var filebytelength = checksumret[0];
        var hashTable = checksumret[1];
        var linked_checksum = checksumret[2];
        // var endOffset = data.byteLength - blockSize;
        var adlerInfo = null;
        var lastMatchIndex = 0;
        var dataUint8 = new Uint8Array(data);
        var matchedBlocks = new ArrayBuffer(10000);
        var matchedBlocksUint32 = new Uint32Array(matchedBlocks);
        var matchCount = 0;

        var data_len = data.byteLength;
        var prematching = false;
        var preindex = null;
        var startTime = performance.now();
        var content_traffic = 0;
        for(;;)
        {

            //Here , fingerpint cache can tell us the suitable start position and end position
            var chunkSize = 0;
            // console.log(i,'/',data.byteLength);
            //determine the size of the next data chuck to evaluate. Default to blockSize, but clamp to end of data
            if((i + blockSize) > data_len)
            {
                chunkSize = data_len - i;
                // adlerInfo=null; //need to reset this because the rolling checksum doesn't work correctly on a final non-aligned block
            }
            else
                chunkSize = blockSize;

            //locality optimized
            // prematching = false;
            if(prematching){
                var predict_index = preindex+1;
                //predict_checksum
                var md5sum2 = linked_checksum[predict_index];
                if(md5sum2){
                    // console.log("predict success!");
                    md5sum1 = md5(dataUint8,0,i,chunkSize);

                    if(
                        md5sum1[0] == md5sum2[0] &&
                        md5sum1[1] == md5sum2[1] &&
                        md5sum1[2] == md5sum2[2] &&
                        md5sum1[3] == md5sum2[3]
                    ){
                        var matchedBlock = predict_index;
                        matchedBlocksUint32[2*matchCount] = matchedBlock;
                        matchedBlocksUint32[2*matchCount+1] = i;
                        matchCount++;
                        //check to see if we need more memory for the matched blocks
                        if(2*matchCount >= matchedBlocksUint32.length)
                        {
                            matchedBlocks = appendBuffer(matchedBlocks, new ArrayBuffer(10000));
                            matchedBlocksUint32 = new Uint32Array(matchedBlocks);
                        }

                        lastMatchIndex = matchedBlock;
                        i+=blockSize;
                        if(i >= dataUint8.length -1 ) break;
                        adlerInfo=null;
                        prematching = true;
                        preindex = matchedBlock;
                        continue;
                    }
                }
            }
            // resuse md5 checksum
            chunkSize = blockSize;

            if(adlerInfo){
                adlerInfo = rollingChecksum(adlerInfo, i, i + chunkSize - 1, dataUint8);
            }

            else
                adlerInfo = adler32(i, i + chunkSize - 1, dataUint8);

            var matchedBlock = checkMatch(adlerInfo, hashTable,i,chunkSize,dataUint8);
            if(matchedBlock)
            {
                //if we have a match, do the following:
                //1) add the matched block index to our tracking buffer
                //2) add match block into match cache
                //3) jump forward blockSize bytes and continue
                matchedBlocksUint32[2*matchCount] = matchedBlock;
                matchedBlocksUint32[2*matchCount+1] = i;
                matchCount++;
                //check to see if we need more memory for the matched blocks
                if(2*matchCount >= matchedBlocksUint32.length)
                {
                    matchedBlocks = appendBuffer(matchedBlocks, new ArrayBuffer(10000));
                    matchedBlocksUint32 = new Uint32Array(matchedBlocks);
                }

                lastMatchIndex = matchedBlock;
                i+=blockSize;
                if(i >= dataUint8.length -1 ) break;
                adlerInfo=null;
                prematching = true;
                preindex = matchedBlock;
                continue;
            }else{
                content_traffic++;
            }
            prematching = false;
            if((i) >= dataUint8.length -1) break;
            i++;
        } //end for each byte in the data


        var test1 = performance.now();
        console.log("########## match doc create time: " + (test1 - startTime));

        console.log('########## content traffic is',content_traffic);
        var patchDocumentView32 = new Uint32Array(patchDocument);
        patchDocumentView32[0] = blockSize;
        patchDocumentView32[1] = matchCount;
        patchDocument = appendBuffer(patchDocument, matchedBlocks.slice(0,matchCount * 4 * 2));


        return [patchDocument,filebytelength];
    }

    /**
     * Apply the patch to the destination data, making it into a duplicate of the source data
     * Due to the inability to modify the size of ArrayBuffers once they have been allocated, this function
     * will return a new ArrayBuffer with the update file data. Note that this will consume a good bit of extra memory.
     */
    function applyPatch(patchDocument, data)
    {
        function appendBlock( buffer, blockUint8) {
            var tmp = new Uint8Array( buffer.byteLength + blockUint8.length);
            tmp.set( new Uint8Array( buffer ), 0 );
            tmp.set( blockUint8, buffer.byteLength );
            return tmp.buffer;
        }

        var patchDocumentView32 = new Uint32Array(patchDocument,0,3);
        var blockSize = patchDocumentView32[0];
        var patchCount = patchDocumentView32[1];
        var matchCount = patchDocumentView32[2];
        var matchedBlockView32 = new Uint32Array(patchDocument,12,matchCount);
        var i=0;
        var j=0;

        //first, let's deal with the simple case where we fully match. This is just an optimization for the unchanged file case.
        //to determine this, the number of matches must exactly equal ceil of data / blockSize, and num patches must be zero
        //additionally, the matched block indexes must start with 1 and be in order. This is to deal with the extreme edge case of a block being relocated
        //on an exact block boundary
        if(patchCount == 0)
            if(Math.ceil(data.byteLength / blockSize) == matchCount)
                for(i = 1; i <= matchCount; i++)
                    if(matchedBlockView32[i-1] != i) { break; }
        if((i - 1) == matchCount) return data; //exact match

        //there was a modification. We need to construct the new document.
        //the way this works is as follows:
        //1) for each patch, get the last index of the matching block
        //2) loop through the matchedBlocks, appending blocks up to the index from step 1
        //3) append the patch at that point
        //4) after all patches have been applied, continue to loop through the matchedBlocks appending each one in order
        var offset = 12 + (matchCount * 4); //offset to the start of the patches
        var lastMatchingBlockIndex=0;
        var patchSize=0;
        var patchView8;
        var matchIndex=0; //the index into the matching blocks array
        var blockIndex=0; //the index of the block in the matching blocks array
        var ret = new ArrayBuffer(0);
        var patchDocumentView8 = new Uint8Array(patchDocument);
        var chunkSize=0;
        for(i=0; i< patchCount; i++)
        {
            lastMatchingBlockIndex = readInt32(patchDocumentView8,offset);
            patchSize = readInt32(patchDocumentView8,offset + 4);
            patchView8 = new Uint8Array(patchDocument, offset + 8, patchSize);
            offset = offset + 8 + patchSize;

            for(;matchIndex < matchedBlockView32.length; matchIndex++)
            {
                blockIndex = matchedBlockView32[matchIndex];
                if(blockIndex > lastMatchingBlockIndex) break;
                if((blockIndex * blockSize) > data.byteLength)
                    chunkSize = data.byteLength % blockSize;
                else chunkSize = blockSize;
                ret = appendBlock(ret, new Uint8Array(data, (blockIndex-1) * blockSize, chunkSize));
            }

            ret = appendBlock(ret, patchView8);
        }

        //we're done with all the patches, add the remaining blocks
        for(;matchIndex < matchedBlockView32.length; matchIndex++)
        {
            blockIndex = matchedBlockView32[matchIndex];
            if((blockIndex * blockSize) > data.byteLength)
                chunkSize = data.byteLength % blockSize;
            else chunkSize = blockSize;
            ret = appendBlock(ret, new Uint8Array(data, (blockIndex-1) * blockSize, chunkSize));
        }

        return ret;
    }
    /*
     * parse match document
     * use hash table to store match document: because js object is hash table
     */
    function parseMatchDocument(matchDocument)
    {
        var ret = [];
        var view = new Uint32Array(matchDocument);
        var blockIndex = 1; //blockIndex is 1 based, not zero based
        var numBlocks = view[1];
        var row;
        var hash;

        //each chunk in the document is 20 bytes long. 32 bit view indexes 4 bytes, so increment by 5.
        for(i = 2; i < view.length;)
        {
            match_blockIndex = view[i++];
            match_blockoffset = view[i++];
            ret[match_blockIndex] = match_blockoffset;
        }
        return ret;
    }

    /******** Public API ***********/
    this.createChecksumDocument = createChecksumDocument;
    // this.createPatchDocument = createPatchDocument;
    this.createMatchDocument = createMatchDocument;
    this.parseMatchDocument = parseMatchDocument;
    this.applyPatch = applyPatch;
    this.hash16_coll = 0;
    this.util = {md5: md5, adler32: adler32, rollingChecksum: rollingChecksum, readInt32: readInt32}; //mostly exposing these for the purposes of unit tests, but hey, if they are useful to someone, have at it!
};


if(((typeof require) != "undefined") &&
    ((typeof module) != "undefined") &&
    ((typeof module.exports) != "undefined"))
    module.exports = BSync;


