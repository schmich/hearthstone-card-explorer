file = 'dictionary.json'
gist_id = '6f869b2f7c848f0731e10bea4d08308c'
expected_version = 1

def find_current_version(gist_id)
  contents = ''
  version = 1
  loop do
    next_contents = `gist -r #{gist_id} #{version}`.strip
    return contents, (version - 1) if $?.to_i != 0
    contents = next_contents
    version += 1
  end
end

puts 'Find current dictionary version.'
current, version = find_current_version(gist_id)

if version != expected_version
  raise "Current dictionary version (#{version}) is not the expected version (#{expected_version})."
end

new = File.read(file).strip
if current == new
  raise 'No changes, not uploading.'
else
  print "Upload version #{version} #{file} (y/n)? "
  response = gets.strip.downcase

  if response =~ /^y/
    puts "Upload #{file}."
    system("gist -u #{gist_id} #{file} -f #{version}")
  else
    puts "Not uploading."
  end
end
