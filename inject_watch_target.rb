require 'xcodeproj'
require 'fileutils'

TEAM_ID    = 'UWSVWR4VTX'
BUNDLE_ID  = 'com.felcin.app.watchkitapp'
WATCH_NAME = 'FelcinWatch'
WATCH_SRC  = File.expand_path('../ios-watch', __FILE__)
PROJ_PATH  = 'ios/App/App.xcodeproj'
DEST_DIR   = "ios/App/#{WATCH_NAME}"

# Copy source files into the Xcode project tree
FileUtils.mkdir_p(DEST_DIR)
Dir.glob("#{WATCH_SRC}/Sources/*.swift").each { |f| FileUtils.cp(f, DEST_DIR) }
FileUtils.cp("#{WATCH_SRC}/Info.plist",              DEST_DIR)
FileUtils.cp("#{WATCH_SRC}/FelcinWatch.entitlements", DEST_DIR)
puts "Copied #{Dir.glob("#{DEST_DIR}/*").size} files to #{DEST_DIR}"

project = Xcodeproj::Project.open(PROJ_PATH)

# Remove any existing Watch target (idempotent re-runs)
project.targets.select { |t| t.name == WATCH_NAME }.each(&:remove_from_project)
project.main_group.groups.select { |g| g.name == WATCH_NAME }.each(&:remove_from_project)

# Create group
watch_group = project.main_group.new_group(WATCH_NAME, WATCH_NAME)

# Add Swift sources
swift_refs = Dir.glob("#{DEST_DIR}/*.swift").map do |f|
  ref = watch_group.new_file(File.basename(f))
  ref.source_tree = '<group>'
  ref.last_known_file_type = 'sourcecode.swift'
  ref
end

# Add Info.plist
plist_ref = watch_group.new_file('Info.plist')
plist_ref.source_tree = '<group>'
plist_ref.last_known_file_type = 'text.plist.xml'

# Add entitlements
ent_ref = watch_group.new_file('FelcinWatch.entitlements')
ent_ref.source_tree = '<group>'
ent_ref.last_known_file_type = 'text.plist.entitlements'

# Create watchOS application target
watch_target = project.new_target(:application, WATCH_NAME, :watchos, '9.0')

watch_target.build_configurations.each do |cfg|
  s = cfg.build_settings
  s['PRODUCT_BUNDLE_IDENTIFIER']          = BUNDLE_ID
  s['PRODUCT_NAME']                       = WATCH_NAME
  s['SDKROOT']                            = 'watchos'
  s['WATCHOS_DEPLOYMENT_TARGET']          = '9.0'
  s['SWIFT_VERSION']                      = '5.0'
  s['DEVELOPMENT_TEAM']                   = TEAM_ID
  s['CODE_SIGN_STYLE']                    = 'Manual'
  s['CODE_SIGN_IDENTITY']                 = 'Apple Distribution'
  s['CODE_SIGN_ENTITLEMENTS']             = "#{WATCH_NAME}/FelcinWatch.entitlements"
  s['INFOPLIST_FILE']                     = "#{WATCH_NAME}/Info.plist"
  s['MARKETING_VERSION']                  = '1.6'
  s['TARGETED_DEVICE_FAMILY']             = '4'
  s['ALWAYS_SEARCH_USER_PATHS']           = 'NO'
  s['SWIFT_EMIT_LOC_STRINGS']             = 'YES'
  s['GENERATE_INFOPLIST_FILE']            = 'NO'
  s['ASSETCATALOG_COMPILER_APPICON_NAME'] = 'AppIcon'
  s['PROVISIONING_PROFILE_SPECIFIER']     = ENV.fetch('WATCH_PROFILE_UUID', '')
end

# Add Swift files to Compile Sources
swift_refs.each { |ref| watch_target.source_build_phase.add_file_reference(ref) }

# Shell script build phase on the Watch TARGET itself (not the main App target).
# Runs before the Watch app is signed so actool output is included in the signature.
# SRCROOT during Watch build = ios/App — logo is two levels up at repo root/ios-icons/.
icon_script = project.new(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
icon_script.name            = 'Compile Watch Icons'
icon_script.shell_path      = '/bin/bash'
icon_script.show_env_vars_in_log = '1'
icon_script.output_paths    = ['$(BUILT_PRODUCTS_DIR)/$(CONTENTS_FOLDER_PATH)/Assets.car']
icon_script.shell_script    = <<~'BASH'
  set -e
  LOGO="${SRCROOT}/../../ios-icons/AppIcon-1024@1x.png"
  if [ ! -f "$LOGO" ]; then echo "Watch icon logo not found at $LOGO"; exit 1; fi

  WORK=$(mktemp -d)
  XCASSETS="$WORK/WatchIcons.xcassets"
  ICONSET="$XCASSETS/AppIcon.appiconset"
  mkdir -p "$ICONSET"

  printf '%s\n' '{"info":{"author":"xcode","version":1}}' > "$XCASSETS/Contents.json"
  printf '%s\n' '{"images":[{"filename":"i80.png","idiom":"watch","role":"appLauncher","scale":"2x","size":"80x80","subtype":"38mm"},{"filename":"i88.png","idiom":"watch","role":"appLauncher","scale":"2x","size":"88x88","subtype":"40mm"},{"filename":"i92.png","idiom":"watch","role":"appLauncher","scale":"2x","size":"92x92","subtype":"41mm"},{"filename":"i100.png","idiom":"watch","role":"appLauncher","scale":"2x","size":"100x100","subtype":"44mm"},{"filename":"i102.png","idiom":"watch","role":"appLauncher","scale":"2x","size":"102x102","subtype":"45mm"},{"filename":"i108.png","idiom":"watch","role":"appLauncher","scale":"2x","size":"108x108","subtype":"49mm"},{"filename":"i1024.png","idiom":"watch-marketing","scale":"1x","size":"1024x1024"}],"info":{"author":"xcode","version":1}}' > "$ICONSET/Contents.json"

  for SIZE in 80 88 92 100 102 108; do
    sips -z $SIZE $SIZE "$LOGO" --out "$ICONSET/i${SIZE}.png" > /dev/null
  done
  cp "$LOGO" "$ICONSET/i1024.png"

  BUNDLE_DIR="${BUILT_PRODUCTS_DIR}/${CONTENTS_FOLDER_PATH}"
  echo "Compiling icons into: $BUNDLE_DIR"

  xcrun actool "$XCASSETS" \
    --compile "$BUNDLE_DIR" \
    --platform watchos \
    --minimum-deployment-target 9.0 \
    --target-device watch \
    --app-icon AppIcon \
    --output-partial-info-plist "$WORK/partial.plist" \
    2>&1

  echo "Assets.car: $(ls -lah "$BUNDLE_DIR/Assets.car" 2>/dev/null || echo MISSING)"

  if [ -f "$WORK/partial.plist" ]; then
    /usr/libexec/PlistBuddy -c "Delete :CFBundleIcons" "$BUNDLE_DIR/Info.plist" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Merge $WORK/partial.plist" "$BUNDLE_DIR/Info.plist" \
      && echo "Info.plist patched with CFBundleIcons" \
      || echo "plist merge non-fatal"
  fi

  rm -rf "$WORK"
  echo "=== Watch icon compile complete ==="
BASH

watch_target.build_phases << icon_script
puts "Icon script added to Watch target"

# Make iPhone app depend on Watch app (embeds it)
main_target = project.targets.find { |t| t.name == 'App' }
if main_target
  main_target.add_dependency(watch_target)

  embed_phase = main_target.build_phases.find { |p| p.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase) && p.name == 'Embed Watch Content' }
  unless embed_phase
    embed_phase = project.new(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase)
    embed_phase.name          = 'Embed Watch Content'
    embed_phase.dst_subfolder_spec = '16'
    embed_phase.dst_path      = '$(CONTENTS_FOLDER_PATH)/Watch'
    main_target.build_phases << embed_phase
  end

  watch_product_ref = watch_target.product_reference
  build_file = project.new(Xcodeproj::Project::Object::PBXBuildFile)
  build_file.file_ref = watch_product_ref
  build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  embed_phase.files << build_file
end

project.save
puts "Watch target '#{WATCH_NAME}' (#{BUNDLE_ID}) added to #{PROJ_PATH}"
