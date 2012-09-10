require 'optparse'

class Primegen < Array
  def initialize
    @prime = 1
    @step = nil
  end
  def succ
    loop do
      if (@step)
        @prime += @step
        @step = 6 - @step
      else
        case @prime
        when 1; @prime = 2
        when 2; @prime = 3
        when 3; @prime = 5; @step = 2
        end
      end
      return @prime
    end
  end
  def each(&block)
    loop { block.call(succ) }
  end
end

def prime_division(value, generator = Primegen.new)
  raise ZeroDivisionError if value == 0
  if value < 0
    value = -value
    pv = [[-1, 1]]
  else
    pv = []
  end
  for prime in generator
    count = 0
    while (value1, mod = value.divmod(prime)
      mod) == 0
      value = value1
      count += 1
    end
    if count != 0
      pv.push [prime, count]
    end
    break if value1 <= prime
  end
  if value > 1
    pv.push [value, 1]
  end
  return pv
end

maximum = 10
OptionParser.new do |o|
  o.banner = "Usage: #{File.basename $0} [-m MAXIMUM]"
  o.on("-m MAXIMUM", Integer,
       "Count up to MAXIMUM [#{maximum}]") { |m| maximum = m }
  o.parse! rescue ($stderr.puts $!, o; exit 1)
  ($stderr.puts o; exit 1) unless ARGV.size == 0
end

# 1 has no prime factors
puts "1 is 1" unless maximum < 1

2.upto(maximum) do |i|
  # i is 504 => i.prime_division is [[2, 3], [3, 2], [7, 1]]
  f = prime_division(i).map! do |factor, exponent|
    # convert [2, 3] to "2 x 2 x 2"
    ([factor] * exponent).join " x "
  end.join " x "
  puts "#{i} is #{f}"
end