should = require('should')

{spawn} = require('child_process')
http = require('http')

run = (options, callback) ->
  commandPath = __dirname + '/../bin/croonga'
  command = spawn commandPath, options
  output = {stdout: '', stderr: ''}
  command.stdout.on 'data', (data) ->
    output.stdout += data
  command.stderr.on 'data', (data) ->
    output.stderr += data

  callback(null, command, output)

describe 'croonga command', ->
  it 'should output help for --help', (done) ->
    run ['--help'], (error, command, output) ->
      command.on 'exit', ->
        output.stdout.should.include("Usage:")
        done()
