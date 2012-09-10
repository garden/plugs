using System;
public class Test
{
        public static void Main()
        {
                int n;
                while ((n = int.Parse(Console.ReadLine()))!=42)
                        Console.WriteLine(n);
        }
}