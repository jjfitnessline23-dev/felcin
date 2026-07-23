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
  s['PRODUCT_BUNDLE_IDENTIFIER']   = BUNDLE_ID
  s['PRODUCT_NAME']                = WATCH_NAME
  s['SDKROOT']                     = 'watchos'
  s['WATCHOS_DEPLOYMENT_TARGET']   = '9.0'
  s['SWIFT_VERSION']               = '5.0'
  s['DEVELOPMENT_TEAM']            = TEAM_ID
  s['CODE_SIGN_STYLE']             = 'Manual'
  s['CODE_SIGN_IDENTITY']          = 'Apple Distribution'
  s['CODE_SIGN_ENTITLEMENTS']      = "#{WATCH_NAME}/FelcinWatch.entitlements"
  s['INFOPLIST_FILE']              = "#{WATCH_NAME}/Info.plist"
  s['MARKETING_VERSION']           = '1.5'
  s['TARGETED_DEVICE_FAMILY']      = '4'  # Apple Watch
  s['ALWAYS_SEARCH_USER_PATHS']    = 'NO'
  s['SWIFT_EMIT_LOC_STRINGS']      = 'YES'
  # provisioning profile set via env var in codemagic.yaml
  s['PROVISIONING_PROFILE_SPECIFIER'] = ENV.fetch('WATCH_PROFILE_UUID', '')
end

# Add Swift files to Compile Sources
swift_refs.each { |ref| watch_target.source_build_phase.add_file_reference(ref) }

# Make iPhone app depend on Watch app (embeds it)
main_target = project.targets.find { |t| t.name == 'App' }
if main_target
  main_target.add_dependency(watch_target)

  # Embed Watch app in iPhone app
  embed_phase = main_target.build_phases.find { |p| p.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase) && p.name == 'Embed Watch Content' }
  unless embed_phase
    embed_phase = project.new(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase)
    embed_phase.name = 'Embed Watch Content'
    embed_phase.dst_subfolder_spec = '16'  # Watch app subfolder
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
