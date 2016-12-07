file = 'dictionary.json'
gist_id = '42fd24ab7347de93a38ea113e35cfe9b'
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
  raise 'No changes, not publishing.'
else
  print "Publish version #{version} #{file} (y/n)? "
  response = gets.strip.downcase

  if response =~ /^y/
    puts "Publish #{file}."
    system("gist -u #{gist_id} #{file} -f #{version}")
    puts 'Published.'
  else
    puts 'Not uploading.'
  end
end
