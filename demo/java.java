/* package whatever; // don't place package name! */
 
/* The class name doesn't have to be Main, as long as the class is not public. */
class Main
{
  public static void main (String[] args) throws java.lang.Exception
  {
     java.io.BufferedReader r = new java.io.BufferedReader (new java.io.InputStreamReader (System.in));
     String s;
     while (!(s=r.readLine()).startsWith("42")) System.out.println(s);
  }
}