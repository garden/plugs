' Pete Guhl
' 03-04-2012
'
' Basic VBScript support for codemirror2

Const ForReading = 1, ForWriting = 2, ForAppending = 8

Call Sub020_PostBroadcastToUrbanAirship(strUserName, strPassword, intTransmitID, strResponse)

If Not IsNull(strResponse) AND Len(strResponse) = 0 Then
    boolTransmitOkYN = False
Else
    ' WScript.Echo "Oh Happy Day! Oh Happy DAY!"
    boolTransmitOkYN = True
End If

strComputer = "."
Set objWMIService = GetObject("winmgmts:" _
& "{impersonationLevel=impersonate}!\\" _
& strComputer & "\root\subscription")

Set obj1 = objWMIService.Get("__EventFilter.Name='BVTFilter'")

set obj2set = obj1.Associators_("__FilterToConsumerBinding")

set obj3set = obj1.References_("__FilterToConsumerBinding")



For each obj2 in obj2set
                WScript.echo "Deleting the object"
                WScript.echo obj2.GetObjectText_
                obj2.Delete_
next

For each obj3 in obj3set
                WScript.echo "Deleting the object"
                WScript.echo obj3.GetObjectText_
                obj3.Delete_
next

WScript.echo "Deleting the object"
WScript.echo obj1.GetObjectText_
obj1.Delete_