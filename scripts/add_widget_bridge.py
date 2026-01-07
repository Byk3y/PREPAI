#!/usr/bin/env python3
"""
Add WidgetBridge files to Xcode project
"""

import os
import re
import uuid

project_file = 'ios/Brigo.xcodeproj/project.pbxproj'

# Read the project file
with open(project_file, 'r') as f:
    content = f.read()

# Generate UUIDs for the new files
widget_bridge_m_uuid = str(uuid.uuid4()).replace('-', '').upper()[:24]
widget_bridge_swift_uuid = str(uuid.uuid4()).replace('-', '').upper()[:24]
widget_data_manager_uuid = str(uuid.uuid4()).replace('-', '').upper()[:24]

widget_bridge_m_build_uuid = str(uuid.uuid4()).replace('-', '').upper()[:24]
widget_bridge_swift_build_uuid = str(uuid.uuid4()).replace('-', '').upper()[:24]
widget_data_manager_build_uuid = str(uuid.uuid4()).replace('-', '').upper()[:24]

# Check if files are already added
if 'WidgetBridge.m' in content:
    print("✅ WidgetBridge files already in project!")
    exit(0)

print("Adding WidgetBridge files to Xcode project...")

# Find the Brigo group UUID
brigo_group_match = re.search(r'\/\* Brigo \*\/ = \{[^}]+children = \([^)]+([A-F0-9]{24})', content, re.MULTILINE | re.DOTALL)
if not brigo_group_match:
    print("❌ Could not find Brigo group")
    exit(1)

# Find the PBXGroup section for Brigo folder
brigo_group_section = re.search(r'(\/\* Brigo \*\/ = \{[^}]+children = \([^)]+)\);', content, re.MULTILINE | re.DOTALL)
if brigo_group_section:
    # Add file references to the Brigo group
    new_children = brigo_group_section.group(1)
    new_children += f'\n\t\t\t\t{widget_bridge_m_uuid} /* WidgetBridge.m */,'
    new_children += f'\n\t\t\t\t{widget_bridge_swift_uuid} /* WidgetBridge.swift */,'
    new_children += f'\n\t\t\t\t{widget_data_manager_uuid} /* WidgetDataManager.swift */,'
    new_children += '\n\t\t\t);'

    content = content.replace(brigo_group_section.group(0), new_children)

# Add PBXFileReference entries
pbx_file_ref_section = re.search(r'\/\* Begin PBXFileReference section \*\/', content)
if pbx_file_ref_section:
    insert_pos = pbx_file_ref_section.end()
    new_refs = f'''
\t\t{widget_bridge_m_uuid} /* WidgetBridge.m */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.c.objc; path = WidgetBridge.m; sourceTree = "<group>"; }};
\t\t{widget_bridge_swift_uuid} /* WidgetBridge.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WidgetBridge.swift; sourceTree = "<group>"; }};
\t\t{widget_data_manager_uuid} /* WidgetDataManager.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WidgetDataManager.swift; sourceTree = "<group>"; }};'''

    content = content[:insert_pos] + new_refs + content[insert_pos:]

# Add to PBXSourcesBuildPhase (compile sources)
sources_build_phase = re.search(r'(\/\* Sources \*\/ = \{[^}]+files = \([^)]+)\);', content, re.MULTILINE | re.DOTALL)
if sources_build_phase:
    new_sources = sources_build_phase.group(1)
    new_sources += f'\n\t\t\t\t{widget_bridge_m_build_uuid} /* WidgetBridge.m in Sources */,'
    new_sources += f'\n\t\t\t\t{widget_bridge_swift_build_uuid} /* WidgetBridge.swift in Sources */,'
    new_sources += f'\n\t\t\t\t{widget_data_manager_build_uuid} /* WidgetDataManager.swift in Sources */,'
    new_sources += '\n\t\t\t);'

    content = content.replace(sources_build_phase.group(0), new_sources)

# Add PBXBuildFile entries
pbx_build_file_section = re.search(r'\/\* Begin PBXBuildFile section \*\/', content)
if pbx_build_file_section:
    insert_pos = pbx_build_file_section.end()
    new_build_files = f'''
\t\t{widget_bridge_m_build_uuid} /* WidgetBridge.m in Sources */ = {{isa = PBXBuildFile; fileRef = {widget_bridge_m_uuid} /* WidgetBridge.m */; }};
\t\t{widget_bridge_swift_build_uuid} /* WidgetBridge.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {widget_bridge_swift_uuid} /* WidgetBridge.swift */; }};
\t\t{widget_data_manager_build_uuid} /* WidgetDataManager.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {widget_data_manager_uuid} /* WidgetDataManager.swift */; }};'''

    content = content[:insert_pos] + new_build_files + content[insert_pos:]

# Write back
with open(project_file, 'w') as f:
    f.write(content)

print("✅ WidgetBridge.m added")
print("✅ WidgetBridge.swift added")
print("✅ WidgetDataManager.swift added")
print("\n🎉 Files successfully added to Xcode project!")
print("Now run: npx expo run:ios")
