file = 'hearthstone-card-explorer.json'
gist_id = '390515ea1fb19d6b1cd419b2deb28324'

current = `gist -r #{gist_id} #{file}`.strip
new = File.read(file).strip
if current == new
  raise 'No changes, not uploading.'
else
  puts "Upload #{file}."
	system("gist -u #{gist_id} #{file}")
end
