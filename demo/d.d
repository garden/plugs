import std.c.stdio;
 
int main() {
    int x;
    while (scanf("%d", &x) && x!=42) printf ("%d\n", x);
    return 0;
}