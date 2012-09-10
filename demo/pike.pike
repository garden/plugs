int main() {
  string s=Stdio.stdin->gets();
  while (s!="42") {
    write(s+"\n");
    s=Stdio.stdin->gets();
  }
  return 0;
}