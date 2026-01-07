#!/usr/bin/env ruby

require 'xcodeproj'

# Open the Xcode project
project_path = 'ios/Brigo.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main app target
target = project.targets.find { |t| t.name == 'Brigo' }

# Get the Brigo group
brigo_group = project.main_group.find_subpath('Brigo', true)

# Files to add
files_to_add = [
  'ios/Brigo/WidgetBridge.m',
  'ios/Brigo/WidgetBridge.swift',
  'ios/Brigo/WidgetDataManager.swift'
]

puts "Adding WidgetBridge files to Xcode project..."

files_to_add.each do |file_path|
  # Check if file already exists in project
  existing_file = brigo_group.files.find { |f| f.path == File.basename(file_path) }

  unless existing_file
    # Add file reference to the group
    file_ref = brigo_group.new_file(file_path)

    # Add file to the compile sources build phase
    if file_path.end_with?('.m') || file_path.end_with?('.swift')
      target.source_build_phase.add_file_reference(file_ref)
    end

    puts "  ✅ Added: #{File.basename(file_path)}"
  else
    puts "  ⏭️  Already exists: #{File.basename(file_path)}"
  end
end

# Save the project
project.save

puts "\n✨ Widget Bridge files added successfully!"
puts "Now run: npx expo run:ios"
