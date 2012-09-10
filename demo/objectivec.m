#import <objc/objc.h>
#import <objc/Object.h>
 
@interface TestObj : Object
{
    int num;
}
- (void)foo;
@end
 
@implementation TestObj
 
- (void)foo {
     printf("foo\n");
}
 
int main()
{
    id obj = [[TestObj alloc] init];
    [obj foo];
    return 0;
}
@end