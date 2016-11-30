require 'json'
require 'open-uri'

def fetch_card_ids
  puts 'Fetching card IDs.'

  json = open('https://api.hearthstonejson.com/v1/latest/enUS/cards.json').read
  cards = JSON.parse(json)

  ids = {}
  cards.each do |card|
    name = card['name']
    if card['collectible']
      ids[name] = card['id']
    elsif ids[name].nil?
      ids[name] = card['id']
    end
  end

  return ids
end

card_ids = fetch_card_ids

# There can be multiple cards with the same name.
# Since we can't distinguish the duplicates, we only
# take one version of each card name, prioritizing
# collectible cards first.
cards = JSON.parse(File.read('rel-metadata.json'))
cards = Hash[
  cards.map { |card|
    [card['name'], card]
  }.sort_by { |_, card|
    card['collectible'] ? 1 : 0
  }
].values

cards.each do |card|
  name = card['name']
  id = card_ids[name]
  if !id
    puts "Skip #{name}, no associated ID."
    next
  end

  puts "Download #{name} (#{id})."

  file_name = File.join('hearthstone-card-images', 'rel', "#{id}.png")
  open(card['image']) do |r|
    open(file_name, 'w') do |w|
      w.write(r.read)
    end
  end
end

puts 'Finished.'
