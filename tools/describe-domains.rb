#!/usr/bin/env ruby

require 'json'
require 'bundler'
Bundler.require

# Set these environment variables:
# * AWS_ACCESS_KEY_ID
# * AWS_SECRET_ACCESS_KEY

module AWS
  class CloudSearch
    class Request < Core::Http::Request
      include Core::Signature::Version4

      def service
        'cloudsearch'
      end

      def region
        'us-east-1'
      end
    end
  end
end

request = AWS::CloudSearch::Request.new
request.host = "cloudsearch.us-east-1.amazonaws.com"
request.add_param 'Action', 'DescribeDomains'
request.add_param 'Version', '2011-02-01'

credential_provider = AWS::Core::CredentialProviders::ENVProvider.new('AWS')
request.add_authorization!(credential_provider)
puts "---- Request"
p request

handler = AWS::Core::Http::NetHttpHandler.new()
response = AWS::Core::Http::Response.new
handler.handle(request, response)
puts "---- Response"
p response
puts "-- body"
puts response.body
