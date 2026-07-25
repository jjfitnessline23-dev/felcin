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
FileUtils.cp("#{WATCH_SRC}/Info.plist",               DEST_DIR)
FileUtils.cp("#{WATCH_SRC}/FelcinWatch.entitlements",  DEST_DIR)
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
  s['PRODUCT_BUNDLE_IDENTIFIER']        = BUNDLE_ID
  s['PRODUCT_NAME']                     = WATCH_NAME
  s['SDKROOT']                          = 'watchos'
  s['WATCHOS_DEPLOYMENT_TARGET']        = '9.0'
  s['SWIFT_VERSION']                    = '5.0'
  s['DEVELOPMENT_TEAM']                 = TEAM_ID
  s['CODE_SIGN_STYLE']                  = 'Manual'
  s['CODE_SIGN_IDENTITY']               = 'Apple Distribution'
  s['CODE_SIGN_ENTITLEMENTS']           = "#{WATCH_NAME}/FelcinWatch.entitlements"
  s['INFOPLIST_FILE']                   = "#{WATCH_NAME}/Info.plist"
  s['MARKETING_VERSION']                = '1.6'
  s['TARGETED_DEVICE_FAMILY']           = '4'
  s['ALWAYS_SEARCH_USER_PATHS']         = 'NO'
  s['SWIFT_EMIT_LOC_STRINGS']           = 'YES'
  s['GENERATE_INFOPLIST_FILE']          = 'NO'
  s['ASSETCATALOG_COMPILER_APPICON_NAME'] = 'AppIcon'
  s['PROVISIONING_PROFILE_SPECIFIER']   = ENV.fetch('WATCH_PROFILE_UUID', '')
end

# Add Swift files to Compile Sources
swift_refs.each { |ref| watch_target.source_build_phase.add_file_reference(ref) }

# Add a Script Build Phase that generates & compiles Watch icons during the Xcode build.
# This runs as part of the Watch target's build, writing Assets.car into the built .app
# before it gets archived — no post-archive injection needed.
icon_script = project.new(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
icon_script.name = 'Compile Watch App Icons'
icon_script.shell_path = '/bin/bash'
icon_script.show_env_vars_in_log = '0'
icon_script.shell_script = <<~'BASH'
  echo "=== Watch Icons script starting ==="
  echo "  BUILT_PRODUCTS_DIR=$BUILT_PRODUCTS_DIR"
  echo "  PRODUCT_NAME=$PRODUCT_NAME"
  echo "  SRCROOT=$SRCROOT"

  LOGO="${SRCROOT}/../../logo_ios_1024.png"
  if [ ! -f "$LOGO" ]; then
    echo "=== Watch Icons: logo not found at $LOGO — skipped ==="
    exit 0
  fi

  BUNDLE_DIR="${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app"
  echo "  Bundle dir: $BUNDLE_DIR"
  ls "$BUNDLE_DIR" 2>/dev/null | head -5 || echo "  (bundle dir not yet created)"

  TMPCAT=$(mktemp -d)
  ICONSET="$TMPCAT/AppIcon.appiconset"
  mkdir -p "$ICONSET"

  printf '{"info":{"author":"xcode","version":1}}' > "$TMPCAT/Contents.json"
  printf '{"images":[{"filename":"i80.png","idiom":"watch","role":"appLauncher","scale":"2x","size":"80x80","subtype":"38mm"},{"filename":"i88.png","idiom":"watch","role":"appLauncher","scale":"2x","size":"88x88","subtype":"40mm"},{"filename":"i92.png","idiom":"watch","role":"appLauncher","scale":"2x","size":"92x92","subtype":"41mm"},{"filename":"i100.png","idiom":"watch","role":"appLauncher","scale":"2x","size":"100x100","subtype":"44mm"},{"filename":"i102.png","idiom":"watch","role":"appLauncher","scale":"2x","size":"102x102","subtype":"45mm"},{"filename":"i108.png","idiom":"watch","role":"appLauncher","scale":"2x","size":"108x108","subtype":"49mm"},{"filename":"i1024.png","idiom":"watch-marketing","scale":"1x","size":"1024x1024"}],"info":{"author":"xcode","version":1}}' > "$ICONSET/Contents.json"

  for SIZE in 80 88 92 100 102 108; do
    sips -z $SIZE $SIZE "$LOGO" --out "$ICONSET/i${SIZE}.png" > /dev/null 2>&1
  done
  cp "$LOGO" "$ICONSET/i1024.png"
  echo "  Source PNGs: $(ls $ICONSET/*.png | wc -l)"

  rm -f "${BUNDLE_DIR}/Assets.car"
  PARTIAL="${TMPCAT}/partial.plist"
  xcrun actool "$TMPCAT" \
    --compile "$BUNDLE_DIR" \
    --platform watchos \
    --minimum-deployment-target 9.0 \
    --target-device watch \
    --app-icon AppIcon \
    --output-partial-info-plist "$PARTIAL" \
    2>&1 || echo "  actool returned non-zero (non-fatal)"

  ls -la "${BUNDLE_DIR}/Assets.car" 2>/dev/null && echo "  Assets.car OK" || echo "  WARNING: Assets.car missing"

  # Set CFBundleIconName in the compiled Info.plist regardless of GENERATE_INFOPLIST_FILE setting
  PLIST="${BUNDLE_DIR}/Info.plist"
  if [ -f "$PLIST" ]; then
    /usr/libexec/PlistBuddy -c "Delete :CFBundleIconName" "$PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :CFBundleIconName string AppIcon" "$PLIST"
    echo "  CFBundleIconName=AppIcon written to $PLIST"
  else
    echo "  WARNING: $PLIST not found yet — will set after copy phase"
  fi

  rm -rf "$TMPCAT"
  echo "=== Watch Icons script complete ==="
BASH

# Append icon script phase after Compile Sources
watch_target.build_phases << icon_script
puts "Icon script build phase added"

# Make iPhone app depend on Watch app (embeds it)
main_target = project.targets.find { |t| t.name == 'App' }
if main_target
  main_target.add_dependency(watch_target)

  embed_phase = main_target.build_phases.find { |p| p.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase) && p.name == 'Embed Watch Content' }
  unless embed_phase
    embed_phase = project.new(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase)
    embed_phase.name = 'Embed Watch Content'
    embed_phase.dst_subfolder_spec = '16'
    embed_phase.dst_path = '$(CONTENTS_FOLDER_PATH)/Watch'
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
