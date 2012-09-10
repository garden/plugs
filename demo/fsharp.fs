open System
 
let mutable num = System.Console.ReadLine()
while not(System.String.Equals(num, "42", System.StringComparison.CurrentCultureIgnoreCase)) do
    System.Console.Write(num)
    num <- System.Console.ReadLine()
    System.Console.WriteLine()