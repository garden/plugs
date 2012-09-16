.data
x:
        .long   0
s:
        .string "%d\n\0"
 
.text
.global main
main:                           # int main()
                                # {
loop:                           #       for (;;) {
        pushl   $x              #               scanf("%d", &x);
        pushl   $s
        call    scanf
        addl    $8, %esp
 
        movl    x, %eax         #               if (x == 42) break;
        subl    $42, %eax
        jz      break
 
        pushl   x               #               printf("%d\n", x);
        pushl   $s
        call    printf
        addl    $8, %esp
 
        jmp     loop            #       }
break:
 
        xor     %eax, %eax      #       return 0;
        ret
                                # }
 