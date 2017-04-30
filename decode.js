var assert = require('assert')
var fs = require('fs')
var hexpp = require('hexpp')
var path = require('path')

var source = fs.readFileSync(path.join(__dirname, 'parquet.thrift'), 'ascii');

var thrift = require('thrift')
  var types = require('./gen-nodejs/parquet_types')

//the key is CompactProtocol!
function parse(buffer, type) {
  var transport = new thrift.TFramedTransport(buffer)
  var protocol = new thrift.TCompactProtocol(transport)
  type.read(protocol)
  parse.bytes = protocol.trans.readPos
  return type
}

module.exports = function (buffer) {

  assert.equal(buffer.slice(buffer.length - 4, buffer.length).toString('ascii'), 'PAR1', 'correct magic number')

  var footerLength = buffer.readInt32LE(buffer.length - 8)
  var footer = buffer.slice(buffer.length - (footerLength + 8), buffer.length)

  var fmd = parse(footer, new types.FileMetaData())

//  console.log("FileMetaData", require('util').inspect(fmd, {depth: 10}))

  for(var i in fmd.row_groups[0].columns) {
//    if(fmd.row_groups[0].columns[i].encoding == 0)
//      fmd.row_groups[0]
      column_chunk(fmd.row_groups[0].columns[i], i)
  //  column_chunk(fmd.row_groups[0].columns[1])
  }

  function column_chunk(cc) {
//    console.log('ColumnChunk', cc)
    var start = cc.file_offset, length = cc.meta_data.total_compressed_size
    var page_header = parse(buffer.slice(start, start+length), new types.PageHeader())
  //  console.log('PageHeader', page_header)
    
    //plain encoding.
    if(false && page_header.data_page_header && page_header.data_page_header.encoding === 0) {
      return
      console.log(hexpp(buffer.slice(start+parse.bytes, start+length)))
      var values = buffer.slice(start+parse.bytes, start+length)

      //read out strings. why is there an 6 byte offset?
      console.log('HEAD', values.slice(0, 6))
      var offset =  6, ary = []
      while(offset < values.length) {
        //for BYTE_ARRAY length is 32LE, then that many bytes.
        var length = values.readUInt32LE(offset)
        console.log('length', length)
        offset += 4
        ary.push(values.slice(offset, offset+length).toString())
        offset += length
      }
      console.log(ary)
    }
    else {
//      console.log('-----------------------------------')
      console.log(cc.meta_data.path_in_schema)
      if(page_header.data_page_header)
        console.log('DPH', page_header.data_page_header.encoding)
      else {
        console.log('DICT', page_header)
        console.log(hexpp(buffer.slice(start+parse.bytes, start+length)))
      }
//      console.log(start, length)
//      console.log(page_header.data_page_header && page_header.data_page_header.encoding)
//      console.log(hexpp(buffer.slice(start+parse.bytes, start+length)))
    }
  }


}

if(!module.parent)
  module.exports(require('fs').readFileSync(process.argv[2]))






