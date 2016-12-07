require 'open-uri'

open('https://api.hearthstonejson.com/v1/latest/enUS/cards.json') do |r|
  open('card-ids.json', 'w') do |w|
    w.write(r.read)
  end
end
