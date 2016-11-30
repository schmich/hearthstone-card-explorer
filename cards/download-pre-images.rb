require 'json'
require 'open-uri'

def normalize(name)
  name.downcase.gsub(/[^a-z]+/, '-').strip
end

cards = JSON.parse(File.read('pre-metadata.json'))

# There can be multiple cards with the same name.
# Since we can't distinguish the duplicates, we only
# take one version of each card name, prioritizing
# collectible cards first.
cards = Hash[
  cards.map { |card|
    [card['name'], card]
  }.sort_by { |_, card|
    card['collectible'] ? 1 : 0
  }
].values

image_map = {}

cards.each do |card|
  src = card['image']
  name = card['name']

  puts "Download #{name}."
  file_name = File.join('pre', normalize(name) + '.png')

  image_map[name] = file_name

  path = File.join('hearthstone-card-images', file_name)
  open(src) do |r|
    open(path, 'w') do |w|
      w.write(r.read)
    end
  end
end

open('pre-image-map.json', 'w') do |w|
  w.write(JSON.dump(image_map))
end

puts 'Finished.'
