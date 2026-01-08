require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'widget-bridge'
  s.version        = package['version']
  s.summary        = 'Native bridge for iOS WidgetKit'
  s.description    = 'Native bridge for iOS WidgetKit'
  s.license        = 'MIT'
  s.author         = 'Antigravity'
  s.homepage       = 'https://github.com/brigo/brigo'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.4'
  s.source         = { :git => 'local' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
