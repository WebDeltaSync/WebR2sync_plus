/**
 * Created by xiaohe on 2017/1/22.
 */
var MOD_ADLER = 65521;
function rollingChecksum(adlerInfo, offset, end, data)
{
    var temp = data[offset - 1]; //this is the first byte used in the previous iteration
    var a = ((adlerInfo.a - temp + data[end]) % MOD_ADLER + MOD_ADLER)%MOD_ADLER;
    var b = ((adlerInfo.b - ((end - offset + 1) * temp) + a - 1) % MOD_ADLER + MOD_ADLER)%MOD_ADLER;
    return {a: a&0xffffffff, b: b&0xffffffff, checksum: ((b << 16) | a)&0xffffffff };
}

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

    return {a: a&0xffffffff, b: b&0xffffffff, checksum: ((b << 16) | a) & 0xffffffff };

}
var data8view = new Uint8Array([1,2,3,4,5,6,7,8]);
console.log(data8view);
adler32info = adler32(0,4,data8view)
console.log(adler32info);
adler32info = rollingChecksum(adler32info,1,5,data8view);
console.log(adler32info);
adler32info1 = adler32(1,5,data8view)
console.log(adler32info1);
