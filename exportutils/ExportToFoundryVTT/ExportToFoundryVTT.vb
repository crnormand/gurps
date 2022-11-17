'These aren't usually required Imports within Visual Studio, but have to be included
'here now because the plugin compiler doesn't make these associations automatically.
Imports Microsoft.VisualBasic
Imports System
Imports System.Collections
Imports System.Collections.Generic
Imports System.Diagnostics

'Added for file Encoding ~Stevil
Imports System.Text
Imports System.Text.RegularExpressions

'Everything from here and below is normal code and Imports and such, just as it is
'when developing within Visual Studio for VB projects.
Imports GCA5Engine
Imports System.Drawing
Imports System.Reflection

'Any such DLL needs to add References to:
'
'   GCA5Engine
'   GCA5.Interfaces.DLL
'   System.Drawing  (System.Drawing; v4.X) 'for colors and anything drawaing related.
'
'in order to work as a print sheet.
'
Public Class ExportToFoundryVTT
    Implements GCA5.Interfaces.IExportSheet

    Public Event RequestRunSpecificOptions(sender As GCA5.Interfaces.IExportSheet, e As GCA5.Interfaces.DialogOptions_RequestedOptions) Implements GCA5.Interfaces.IExportSheet.RequestRunSpecificOptions

    Private MyOptions As GCA5Engine.SheetOptionsManager
    Private OwnedItemText As String = "* = item is owned by another, its point value and/or cost is included in the other item."
    Private ShowOwnedMessage As Boolean
    ''' <summary>
    ''' If multiple Characters might be printed, this is the value of the Always Ask Me option
    ''' </summary>
    ''' <remarks></remarks>
    Private AlwaysAskMe As Integer

    '******************************************************************************************
    '* All Interface Implementations
    '******************************************************************************************
    Public Sub CreateOptions(Options As GCA5Engine.SheetOptionsManager) Implements GCA5.Interfaces.IExportSheet.CreateOptions
        'This is the routine where all the Options we want to use are created,
        'and where the UI for the Preferences dialog is filled out.
        '
        'This is equivalent to CharacterSheetOptions from previous implementations

        Dim ok As Boolean
        Dim newOption As GCA5Engine.SheetOption

        Dim descFormat As New SheetOptionDisplayFormat
        descFormat.BackColor = SystemColors.Info
        descFormat.CaptionLocalBackColor = SystemColors.Info

        '* Description block at top *
        newOption = New GCA5Engine.SheetOption
        newOption.Name = "Header_Description"
        newOption.Type = GCA5Engine.OptionType.Header
        newOption.UserPrompt = PluginName() & " " & PluginVersion()
        newOption.DisplayFormat = descFormat
        ok = Options.AddOption(newOption)

        newOption = New GCA5Engine.SheetOption
        newOption.Name = "Description"
        newOption.Type = GCA5Engine.OptionType.Caption
        newOption.UserPrompt = PluginDescription()
        newOption.DisplayFormat = descFormat
        ok = Options.AddOption(newOption)

        '******************************
        '* Characters 
        '******************************
        newOption = New GCA5Engine.SheetOption
        newOption.Name = "Header_Characters"
        newOption.Type = GCA5Engine.OptionType.Header
        newOption.UserPrompt = "Printing Characters"
        ok = Options.AddOption(newOption)

        'NOTE: Because List is now a 0-based Array, the number of the 
        'DefaultValue and the selected Value is 0-based!
        newOption = New GCA5Engine.SheetOption
        newOption.Name = "OutputCharacters"
        newOption.Type = GCA5Engine.OptionType.ListNumber
        newOption.UserPrompt = "When exporting, how do you want to handle exporting when multiple Characters are loaded?"
        newOption.DefaultValue = 0 'first item
        newOption.List = {"Export just the current Character", "Export all the Characters to the file", "Always ask me what to do"}
        ok = Options.AddOption(newOption)
        AlwaysAskMe = 2

        'NOTE: Because List is now a 0-based Array, the number of the 
        'DefaultValue and the selected Value is 0-based!
        newOption = New GCA5Engine.SheetOption
        newOption.Name = "CharacterSeparator"
        newOption.Type = GCA5Engine.OptionType.ListNumber
        newOption.UserPrompt = "Please select how you'd like to mark the break between Characters when printing multiple Characters to the file."
        newOption.DefaultValue = 1 'second item
        newOption.List = {"Do nothing", "Print a line of *", "Print a line of =", "Print a line of -", "Use HTML to indicate a horizontal rule"}
        ok = Options.AddOption(newOption)


        '******************************
        '* Included Sections 
        '******************************
        newOption = New GCA5Engine.SheetOption
        newOption.Name = "Header_ItemNotes"
        newOption.Type = GCA5Engine.OptionType.Header
        newOption.UserPrompt = "Item Notes"
        ok = Options.AddOption(newOption)

        newOption = New GCA5Engine.SheetOption
        newOption.Name = "NotesIncludeDescription"
        newOption.Type = GCA5Engine.OptionType.YesNo
        newOption.UserPrompt = "Include a trait's Description in the User Notes and VTT Notes block."
        newOption.DefaultValue = True
        ok = Options.AddOption(newOption)

    End Sub

    Public Sub UpgradeOptions(Options As GCA5Engine.SheetOptionsManager) Implements GCA5.Interfaces.IExportSheet.UpgradeOptions
        'This is called only when a particular plug-in is loaded the first time,
        'and before SetOptions.

        'I don't do anything with this.
    End Sub


    Public Function PreviewOptions(Options As GCA5Engine.SheetOptionsManager) As Boolean Implements GCA5.Interfaces.IExportSheet.PreviewOptions
        'This is called after options are loaded, but before SupportedFileTypeFilter and PreferredFilterIndex are called,
        'to allow for certain specialty sheets to do a little housekeeping if desired.

        'I dont do anything with this.

        'Be sure to return True to avoid the export process being canceled!
        Return True
    End Function

    Public Function PluginName() As String Implements GCA5.Interfaces.IExportSheet.PluginName
        Return "Export To Foundry VTT"
    End Function
    Public Function PluginDescription() As String Implements GCA5.Interfaces.IExportSheet.PluginDescription
        Return "Exports the currently selected character to an XML file.  Before importing this file into the GURPS Game Aid for Foundry VTT, set the System Setting 'Import File Encoding' to 'UTF-8'."
    End Function
    Public Function PluginVersion() As String Implements GCA5.Interfaces.IExportSheet.PluginVersion
        Return AutoFindVersion()
    End Function

    Public Function PreferredFilterIndex() As Integer Implements GCA5.Interfaces.IExportSheet.PreferredFilterIndex
        'Only returns one filter type, so we just use that. Remember this is 0-based!
        Return 0
    End Function

    Public Function SupportedFileTypeFilter() As String Implements GCA5.Interfaces.IExportSheet.SupportedFileTypeFilter
        Return "XML files (*.xml)|*.xml"
    End Function

    Public Function GenerateExport(Party As GCA5Engine.Party, TargetFilename As String, Options As GCA5Engine.SheetOptionsManager) As Boolean Implements GCA5.Interfaces.IExportSheet.GenerateExport
        Dim PrintMults As Boolean = False

        'This creates the export file on disk.
        'Notify("This is a test", Priority.Red)
        'MsgBox("This is a test")

        'Set our Options to the stored values we've just been given
        MyOptions = Options

        'set our default PrintMults
        'newOption.List = {"Export just the current Character", "Export all the Characters to the file", "Always ask me what to do"}
        If MyOptions.Value("OutputCharacters") = 1 Then
            PrintMults = True
        End If

        'Here, if you needed it, you'd create the RunSpecificOptions that you need the user to set,
        'and then you'd raise the event to get those options from the user.
        'Dim RunSpecificOptions As New GCA5Engine.SheetOptionsManager("RunSpecificOptions For " & Name)
        'RaiseEvent RequestRunSpecificOptions(RunSpecificOptions)

        'if there are multiple Characters...
        If Party.Characters.Count > 1 Then
            '... and if we're supposed to ask what to do...
            If MyOptions.Value("OutputCharacters") = AlwaysAskMe Then
                '... ask what to do.

                'In this case, this would actually be better served with a message box, and that's what's commented out below this block,
                'but this shows the idea behind using the RunSpecificOptions.

                '*****
                '* We need to get more options
                '*****
                Dim ok As Boolean
                Dim newOption As GCA5Engine.SheetOption
                Dim RunSpecificOptions As New GCA5Engine.SheetOptionsManager("RunSpecificOptions For " & PluginName())

                'Create the options
                newOption = New GCA5Engine.SheetOption
                newOption.Name = "Header_Characters"
                newOption.Type = GCA5Engine.OptionType.Header
                newOption.UserPrompt = "Printing Characters"
                ok = RunSpecificOptions.AddOption(newOption)

                newOption = New GCA5Engine.SheetOption
                newOption.Name = "OutputCharacters"
                newOption.Type = GCA5Engine.OptionType.ListNumber
                newOption.UserPrompt = "When exporting, how do you want to handle exporting when multiple Characters are loaded?"
                newOption.DefaultValue = 0 'first item
                newOption.List = {"Export just the current Character", "Export all the Characters to the file"}
                ok = RunSpecificOptions.AddOption(newOption)

                'Create the event object that will carry our options and tell us later if the dialog was canceled
                Dim e As New GCA5.Interfaces.DialogOptions_RequestedOptions
                e.RunSpecificOptions = RunSpecificOptions

                'Raise the event to get the user input
                RaiseEvent RequestRunSpecificOptions(Me, e)

                'If user canceled, we abort
                If e.Canceled Then
                    Return False
                End If

                If RunSpecificOptions.Value("OutputCharacters") = 1 Then
                    'print just one Character
                    PrintMults = True
                End If

            End If
        Else
            PrintMults = False
        End If


        'This is defined in GCA5Engine, and is a text file writer that outputs UTF-8 text files.
        Dim fw As New FileWriter

        'Creates a string buffer for the file, but doesn't actually open and write it until FileClose is called.
        fw.FileOpen(TargetFilename)

        ' Print the curent Character only reguardless of option set. ~Stevil
        PrintMults = False

        If PrintMults Then
            'Export every Character to this file
            For Each CurChar As GCACharacter In Party.Characters
                ExportToFoundryVTT(CurChar, fw)

                'newOption.List = {"Do nothing", "Print a line of *", "Print a line of =", "Print a line of -", "Use HTML to indicate a horizontal rule"}
                Select Case MyOptions.Value("CharacterSeparator")
                    Case 1 'line of *
                        fw.Paragraph(StrDup(60, "*"))
                    Case 2 'line of =
                        fw.Paragraph(StrDup(60, "="))
                    Case 3 'line of -
                        fw.Paragraph(StrDup(60, "-"))
                    Case 4 'html
                        fw.Paragraph("<hr />")
                    Case Else 'do nothing
                End Select
                fw.Paragraph("")
            Next
        Else
            'just print Current Character
            ExportToFoundryVTT(Party.Current, fw)
        End If


        'Save all we've written to the file and quit.
        Try
            fw.FileClose()
        Catch ex As Exception
            'problem encountered
            Notify(PluginName() & ": " & Err.Number & ": " & ex.Message & vbCrLf & "Stack Trace: " & vbCrLf & ex.StackTrace, Priority.Red)
            Return False
        End Try

        'all good
        Return True
    End Function

'******************************************************************************************
'* All Internal Routines
'******************************************************************************************
    Public Function AutoFindVersion() As String
        Dim longFormVersion As String = ""

        Dim currentDomain As AppDomain = AppDomain.CurrentDomain
        'Provide the current application domain evidence for the assembly.
        'Load the assembly from the application directory using a simple name.
        currentDomain.Load("ExportToFoundryVTT")

        'Make an array for the list of assemblies.
        Dim assems As [Assembly]() = currentDomain.GetAssemblies()

        'List the assemblies in the current application domain.
        'Echo("List of assemblies loaded in current appdomain:")
        Dim assem As [Assembly]
        'Dim co As New ArrayList
        For Each assem In assems
            If assem.FullName.StartsWith("ExportToFoundryVTT") Then
                Dim parts(0) As String
                parts = assem.FullName.Split(",")
                'name and version are the first two parts
                longFormVersion = parts(1)
                'Version=1.2.3.4
                parts = longFormVersion.Split("=")
                Return parts(1)
            End If
        Next assem

        Return longFormVersion
    End Function

'****************************************
'* This is where the export to XML happens. :)
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportToFoundryVTT(CurChar As GCACharacter, fw As FileWriter)
        fw.Paragraph("<?xml version=""1.0"" encoding=""utf-8""?>")
        fw.Paragraph("<root release=""Foundry"" version=""GCA5-14"">")
        fw.Paragraph("<character>")
        fw.Paragraph("<name type=""string"">" & CurChar.Name & "</name>")
        fw.Paragraph("")
        fw.Paragraph("<abilities>")
        fw.Paragraph("")
        fw.Paragraph("<skilllist>")
            ExportSkills(CurChar, fw)
        fw.Paragraph("</skilllist>")
        fw.Paragraph("")
        fw.Paragraph("")
        fw.Paragraph("<spelllist>")
            ExportSpells(CurChar, fw)
        fw.Paragraph("</spelllist>")
        fw.Paragraph("")
        fw.Paragraph("</abilities>")
        fw.Paragraph("")
        fw.Paragraph("")
        fw.Paragraph("<attributes>")
            ExportAttributes(CurChar, fw)
        fw.Paragraph("</attributes>")
        fw.Paragraph("")
        fw.Paragraph("")
        fw.Paragraph("<combat>")
            ExportCombat(CurChar, fw)
        fw.Paragraph("")
        fw.Paragraph("<meleecombatlist>")
            ExportMeleeAttacks(CurChar, fw)
        fw.Paragraph("</meleecombatlist>")
        fw.Paragraph("")
        fw.Paragraph("")
        fw.Paragraph("<rangedcombatlist>")
            ExportRangedAttacks(CurChar, fw)
        fw.Paragraph("</rangedcombatlist>")
        fw.Paragraph("")
        fw.Paragraph("")
        fw.Paragraph("<protectionlist>")
            ExportProtection(CurChar, fw)
        fw.Paragraph("</protectionlist>")
        fw.Paragraph("")
        fw.Paragraph("</combat>")
        fw.Paragraph("")
        fw.Paragraph("")
        fw.Paragraph("<encumbrance>")
            ExportEncumbrance(CurChar, fw)
        fw.Paragraph("</encumbrance>")
        fw.Paragraph("")
        fw.Paragraph("")
        fw.Paragraph("<traits>")
            ExportTraits(CurChar, fw)
        fw.Paragraph("")
        fw.Paragraph("<adslist>")
            ExportAds(CurChar, fw)
        fw.Paragraph("</adslist>")
        fw.Paragraph("")
        fw.Paragraph("")
        fw.Paragraph("<disadslist>")
            ExportDisads(CurChar, fw)
        fw.Paragraph("</disadslist>")
        fw.Paragraph("")
        fw.Paragraph("")
        fw.Paragraph("<culturalfamiliaritylist>")
            ExportCulturalFamiliarity(CurChar, fw)
        fw.Paragraph("</culturalfamiliaritylist>")
        fw.Paragraph("")
        fw.Paragraph("")
        fw.Paragraph("<languagelist>")
            ExportLanguages(CurChar, fw)
        fw.Paragraph("</languagelist>")
        fw.Paragraph("")
        fw.Paragraph("<reactionmodifiers>")
            ExportReactionModifiers(CurChar, fw)
        fw.Paragraph("</reactionmodifiers>")
        fw.Paragraph("")
        fw.Paragraph("<conditionalmods>")
            ExportConditionalModifiers(CurChar, fw)
        fw.Paragraph("</conditionalmods>")
        fw.Paragraph("")
            ExportTechLevel(CurChar, fw)
        fw.Paragraph("</traits>")
        fw.Paragraph("")
        fw.Paragraph("")
        fw.Paragraph("<inventorylist>")
            ExportEquipment(CurChar, fw)
        fw.Paragraph("</inventorylist>")
        fw.Paragraph("")
            ExportDescription(CurChar, fw)
            ExportNotes(CurChar, fw)
        fw.Paragraph("")
        fw.Paragraph("<pointtotals>")
            ExportPointSummary(CurChar, fw)
        fw.Paragraph("</pointtotals>")
        fw.Paragraph("")
        fw.Paragraph("</character>")
        fw.Paragraph("</root>")

    End Sub


'****************************************
'* Export Skills
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportSkills(CurChar As GCACharacter, fw As FileWriter)

        Dim i As Integer
        Dim j As Integer
        Dim skills_index As Integer
        Dim tmp As String
        Dim work As String
        Dim tag_index As String

        For i = 1 To CurChar.Items.Count

            If CurChar.Items(i).ItemType = Skills And CurChar.Items(i).TagItem("hide") = "" Then

                ' it's a skill and not hidden
                skills_index = skills_index + 1
                tag_index = LeadingZeroes(skills_index)

                fw.Paragraph("<id-" & tag_index & ">")

                tmp = CurChar.Items(i).FullNameTL

                If CurChar.Items(i).Mods.Count > 0 Then
                    work = " ("
                    For j = 1 To CurChar.Items(i).Mods.Count
                        If j > 1 Then
                            work = work & "; "
                        End If
                        work = work & CurChar.Items(i).Mods(j).FullName
                        work = work & ", " & CurChar.Items(i).Mods(j).TagItem("value")
                    Next
                    work = work & ")"
                    tmp = tmp & work
                End If

                fw.Paragraph("<name type=""string"">" & UpdateEscapeChars(tmp) & "</name>")
                fw.Paragraph("<type type=""string"">" & CurChar.Items(i).TagItem("type") & "</type>")
                fw.Paragraph("<level type=""number"">" & CurChar.Items(i).Level & "</level>")

                work = CurChar.Items(i).TagItem("stepoff")
                If work <> "" Then
                    tmp = work
                    work = CurChar.Items(i).TagItem("step")
                    If work <> "" Then
                        tmp = tmp & work
                    Else
                        tmp = tmp & "?"
                    End If
                Else
                    tmp = tmp & "?+?"
                End If
                fw.Paragraph("<relativelevel type=""string"">" & tmp & "</relativelevel>")

                fw.Paragraph("<points type=""number"">" & CurChar.Items(i).TagItem("points") & "</points>")
                fw.Paragraph("<text type=""string"">" & UpdateEscapeChars(UserVTTNotes(CurChar, i)) & "</text>") '2022-11-17 - combine user notes & vtt notes - ADS
                fw.Paragraph("<pageref type=""string"">" & CurChar.Items(i).TagItem("page") & "</pageref>")
                fw.Paragraph("<parentuuid>" & CurChar.Items(i).ParentKey & "</parentuuid>")
                fw.Paragraph("<uuid>k" & CurChar.Items(i).idkey & "</uuid>")

                fw.Paragraph("</id-" & tag_index & ">")

            End If
        Next

    End Sub


'****************************************
'* Export Spells
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportSpells(CurChar As GCACharacter, fw As FileWriter)

        Dim i As Integer
        Dim j As Integer
        Dim skills_index As Integer
        Dim tmp As String
        Dim work As String
        Dim tag_index As String
        Dim spellClass As String
        Dim spellResist As String
        Dim spellCat As String
        Dim classSplit As Array

        For i = 1 To CurChar.Items.Count
            If CurChar.Items(i).ItemType = Spells And CurChar.Items(i).TagItem("hide") = "" Then

                ' it's a spell and not hidden
                skills_index = skills_index + 1
                tag_index = LeadingZeroes(skills_index)

                fw.Paragraph("<id-" & tag_index & ">")

                tmp = CurChar.Items(i).FullNameTL

                If CurChar.Items(i).Mods.Count > 0 Then
                    work = " ("
                    For j = 1 To CurChar.Items(i).Mods.Count
                        If j > 1 Then
                            work = work & "; "
                        End If
                        work = work & CurChar.Items(i).Mods(j).FullName
                        work = work & ", " & CurChar.Items(i).Mods(j).TagItem("value")
                    Next
                    work = work & ")"
                    tmp = tmp & work
                End If

            spellClass = ""
            spellResist = ""
            if CurChar.Items(i).TagItem("class") <> "" Then
                classSplit = Split(CurChar.Items(i).TagItem("class"), "/", 2)
                If UBound(classSplit) > 0 Then
                    spellClass = classSplit(0)
                    spellResist = classSplit(1)
                Else
                    spellClass = classSplit(0)
                End If
            End If
            spellCat = CurChar.Items(i).TagItem("cat")
            if spellCat = "%NewSpellList%" Then

                spellCat = ""
            End If
                
                fw.Paragraph("<name type=""string"">" & UpdateEscapeChars(tmp) & "</name>")
                fw.Paragraph("<level type=""number"">" & CurChar.Items(i).Level & "</level>")
                fw.Paragraph("<class type=""string"">" & spellClass & "</class>")
                fw.Paragraph("<type type=""string"">" & CurChar.Items(i).TagItem("type") & "</type>")
                fw.Paragraph("<points type=""number"">" & CurChar.Items(i).TagItem("points") & "</points>")
                fw.Paragraph("<text type=""string"">" & UpdateEscapeChars(UserVTTNotes(CurChar, i)) & "</text>") '2022-11-17 - combine user notes & vtt notes - ADS
				

                fw.Paragraph("<time type=""string"">" & CurChar.Items(i).TagItem("time") & "</time>")
                fw.Paragraph("<duration type=""string"">" & CurChar.Items(i).TagItem("duration") & "</duration>")
                fw.Paragraph("<costmaintain type=""string"">" & CurChar.Items(i).TagItem("castingcost") & "</costmaintain>")
                fw.Paragraph("<resist type=""string"">" & spellResist & "</resist>")
                fw.Paragraph("<college type=""string"">" & spellCat & "</college>")
                fw.Paragraph("<pageref type=""string"">" & CurChar.Items(i).TagItem("page") & "</pageref>")
                fw.Paragraph("<parentuuid>" & CurChar.Items(i).ParentKey & "</parentuuid>")
                fw.Paragraph("<uuid>k" & CurChar.Items(i).idkey & "</uuid>")

                work = CurChar.Items(i).TagItem("stepoff")
                If work <> "" Then
                    tmp = work
                    work = CurChar.Items(i).TagItem("step")
                    If work <> "" Then
                        tmp = tmp & work
                    Else
                        tmp = tmp & "?"
                    End If
                Else
                    tmp = tmp & "?+?"
                End If

                fw.Paragraph("</id-" & tag_index & ">")

            End If
        Next

    End Sub


'****************************************
'* Export Attributes
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportAttributes(CurChar As GCACharacter, fw As FileWriter)

        Dim ListLoc, EncRow As Integer

        ListLoc = CurChar.ItemPositionByNameAndExt("ST", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<strength type=""number"">" & CurChar.Items(ListLoc).TagItem("score") & "</strength>")
            fw.Paragraph("<strength_points type=""number"">" & CurChar.Items(ListLoc).TagItem("points") & "</strength_points>")
        End If

        ListLoc = CurChar.ItemPositionByNameAndExt("DX", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<dexterity type=""number"">" & CurChar.Items(ListLoc).TagItem("score") & "</dexterity>")
            fw.Paragraph("<dexterity_points type=""number"">" & CurChar.Items(ListLoc).TagItem("points") & "</dexterity_points>")
        End If

        ListLoc = CurChar.ItemPositionByNameAndExt("IQ", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<intelligence type=""number"">" & CurChar.Items(ListLoc).TagItem("score") & "</intelligence>")
            fw.Paragraph("<intelligence_points type=""number"">" & CurChar.Items(ListLoc).TagItem("points") & "</intelligence_points>")
        End If

        ListLoc = CurChar.ItemPositionByNameAndExt("HT", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<health type=""number"">" & CurChar.Items(ListLoc).TagItem("score") & "</health>")
            fw.Paragraph("<health_points type=""number"">" & CurChar.Items(ListLoc).TagItem("points") & "</health_points>")
        End If

        ListLoc = CurChar.ItemPositionByNameAndExt("Hit Points", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<hitpoints type=""number"">" & CurChar.Items(ListLoc).TagItem("score") & "</hitpoints>")
            fw.Paragraph("<hitpoints_points type=""number"">" & CurChar.Items(ListLoc).TagItem("points") & "</hitpoints_points>")
            fw.Paragraph("<hps type=""number"">" & CurChar.Items(ListLoc).TagItem("score") & "</hps>")
        End If

        ListLoc = CurChar.ItemPositionByNameAndExt("Will", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<will type=""number"">" & CurChar.Items(ListLoc).TagItem("score") & "</will>")
            fw.Paragraph("<will_points type=""number"">" & CurChar.Items(ListLoc).TagItem("points") & "</will_points>")
        End If

        ListLoc = CurChar.ItemPositionByNameAndExt("Perception", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<perception type=""number"">" & CurChar.Items(ListLoc).TagItem("score") & "</perception>")
            fw.Paragraph("<perception_points type=""number"">" & CurChar.Items(ListLoc).TagItem("points") & "</perception_points>")
        End If

        ListLoc = CurChar.ItemPositionByNameAndExt("Fatigue Points", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<fatiguepoints type=""number"">" & CurChar.Items(ListLoc).TagItem("score") & "</fatiguepoints>")
            fw.Paragraph("<fatiguepoints_points type=""number"">" & CurChar.Items(ListLoc).TagItem("points") & "</fatiguepoints_points>")
            fw.Paragraph("<fps type=""number"">" & CurChar.Items(ListLoc).TagItem("score") & "</fps>")
        End If

        ListLoc = CurChar.ItemPositionByNameAndExt("Basic Lift", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<basiclift type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</basiclift>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("One-Handed Lift", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<onehandedlift type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</onehandedlift>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Two-Handed Lift", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<twohandedlift type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</twohandedlift>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Shove/Knock Over", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<shove type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</shove>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Carry on Back", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<carryonback type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</carryonback>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Shift Slightly", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<shiftslightly type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</shiftslightly>")
        End If

        ListLoc = CurChar.ItemPositionByNameAndExt("Fright Check", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<frightcheck type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</frightcheck>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Taste/Smell", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<tastesmell type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</tastesmell>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Touch", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<touch type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</touch>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Vision", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<vision type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</vision>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Hearing", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<hearing type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</hearing>")
        End If


        fw.Paragraph("<thrust type=""string"">" & CurChar.BaseTH & "</thrust>")
        fw.Paragraph("<swing type=""string"">" & CurChar.BaseSW & "</swing>")

        ListLoc = CurChar.ItemPositionByNameAndExt("Speed", Stats)
        If ListLoc = 0 Then
            ListLoc = CurChar.ItemPositionByNameAndExt("Basic Speed", Stats)
        End If

        If ListLoc > 0 Then
            fw.Paragraph("<basicspeed type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</basicspeed>")
            fw.Paragraph("<basicspeed_points type=""number"">" & CurChar.Items(ListLoc).TagItem("points") & "</basicspeed_points>")
        End If

        ListLoc = CurChar.ItemPositionByNameAndExt("Move", Stats)
        If ListLoc = 0 Then
            ListLoc = CurChar.ItemPositionByNameAndExt("Basic Move", Stats)
        End If

        If ListLoc > 0 Then
            fw.Paragraph("<basicmove type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</basicmove>")
            fw.Paragraph("<basicmove_points type=""number"">" & CurChar.Items(ListLoc).TagItem("points") & "</basicmove_points>")
        End If

        EncRow = CurChar.EncumbranceLevel
        If EncRow = 0 Then
            ListLoc = CurChar.ItemPositionByNameAndExt("No Encumbrance Move", Stats)
            If ListLoc > 0 Then
                fw.Paragraph("<move type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</move>")
            End If
        ElseIf EncRow = 1 Then
            ListLoc = CurChar.ItemPositionByNameAndExt("Light Encumbrance Move", Stats)
            If ListLoc > 0 Then
                fw.Paragraph("<move type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</move>")
            End If
        ElseIf EncRow = 2 Then
            ListLoc = CurChar.ItemPositionByNameAndExt("Medium Encumbrance Move", Stats)
            If ListLoc > 0 Then
                fw.Paragraph("<move type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</move>")
            End If
        ElseIf EncRow = 3 Then
            ListLoc = CurChar.ItemPositionByNameAndExt("Heavy Encumbrance Move", Stats)
            If ListLoc > 0 Then
                fw.Paragraph("<move type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</move>")
            End If
        ElseIf EncRow = 4 Then
            ListLoc = CurChar.ItemPositionByNameAndExt("X-Heavy Encumbrance Move", Stats)
            If ListLoc > 0 Then
                fw.Paragraph("<move type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</move>")
            End If
        End If

    End Sub


'****************************************
'* Export Combat
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportCombat(CurChar As GCACharacter, fw As FileWriter)

        Dim StatNames As New Collection
        Dim ListLoc As Integer
        Dim EncRow As Integer
        Dim Score As Integer
        Dim Dodge As Integer

        ListLoc = CurChar.ItemPositionByNameAndExt("Dodge", Stats)
        if ListLoc > 0 then
            'fw.Paragraph("<dodge type=""number"">" & CurChar.Items(ListLoc).TagItem("score") & "</dodge>")
        end if


        ' dodge list
        ListLoc = CurChar.ItemPositionByNameAndExt("Dodge", Stats)
        If ListLoc > 0 Then
            Score = CurChar.Items(ListLoc).TagItem("score")
            fw.Paragraph("<enc0_dodge type=""number"">" & Score & "</enc0_dodge>")
            fw.Paragraph("<enc1_dodge type=""number"">" & (Score - 1) & "</enc1_dodge>")
            fw.Paragraph("<enc2_dodge type=""number"">" & (Score - 2) & "</enc2_dodge>")
            fw.Paragraph("<enc3_dodge type=""number"">" & (Score - 3) & "</enc3_dodge>")
            fw.Paragraph("<enc4_dodge type=""number"">" & (Score - 4) & "</enc4_dodge>")
        End If


        EncRow = CurChar.EncumbranceLevel
        ListLoc = CurChar.ItemPositionByNameAndExt("Dodge", Stats)
        If ListLoc > 0 Then
            Dodge = CurChar.Items(ListLoc).TagItem("score")
            If EncRow = 0 Then
                fw.Paragraph("<dodge type=""number"">" & (Dodge) & "</dodge>")
            ElseIf EncRow = 1 Then
                fw.Paragraph("<dodge type=""number"">" & (Dodge - 1) & "</dodge>")
            ElseIf EncRow = 2 Then
                fw.Paragraph("<dodge type=""number"">" & (Dodge - 2) & "</dodge>")
            ElseIf EncRow = 3 Then
                fw.Paragraph("<dodge type=""number"">" & (Dodge - 3) & "</dodge>")
            ElseIf EncRow = 4 Then
                fw.Paragraph("<dodge type=""number"">" & (Dodge - 4) & "</dodge>")
            End If
        End If

        fw.Paragraph("<parry type=""number"">" & CurChar.parryscore & "</parry>")
        fw.Paragraph("<block type=""number"">" & CurChar.blockscore & "</block>")
        fw.Paragraph("<dr type=""string"">" & RemoveNoteBrackets(CurChar.Body.Item("Torso").DR) & "</dr>")

    End Sub


'****************************************
'* Export Melee Attacks
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportMeleeAttacks(CurChar As GCACharacter, fw As FileWriter)
        Dim CurMode As Integer
        Dim DamageText As String
        Dim i As Integer
        Dim item_index As Integer
        Dim tag_index As String
        Dim weapon_index As Integer
        Dim weapon_mode_index As Integer
        Dim mode_tag_index As String
        Dim db As String
        Dim blk As Long
        Dim okay As Boolean
        Dim tmp As String
        Dim saved_level As String

        item_index = 0
        For i = 1 To CurChar.Items.Count

            'we only want to include hand weapons here, so look for items with Reach
            okay = False
            tmp = CurChar.Items(i).TagItem("charreach")

            If tmp = "C" Then
                okay = True
            End If
            ' C,1 1,2 etc.
            If Len(tmp) > 1 Then
                okay = True
            Else
            ' 1, 2, etc.
                If StrToLng(tmp) > 0 Then
                    okay = True
                End If
            End If
            ' Trying to allow non-reach-like values to be ignored (a user uses this for some reason)

            if tmp = "||" then
                okay = False
            End If

            'exclude hidden items
            If CurChar.Items(i).TagItem("hide") <> "" Then
                ' only hide stats & equipment--hidden ads or skills should print
                If CurChar.Items(i).ItemType = Equipment Or CurChar.Items(i).ItemType = Stats Then
                    okay = False
                End If
            End If

            If okay Then
                '* loop round for each reach mode
                CurMode = CurChar.Items(i).DamageModeTagItemAt("charreach")

                ' create the opening tag for this weapon item
                weapon_index = weapon_index + 1
                tag_index = LeadingZeroes(weapon_index)

                Dim qty : qty = 1 
                If StrToLng(CurChar.Items(i).tagitem("count")) <> 0 Then
                    qty = StrToLng(CurChar.Items(i).tagitem("count"))
                End If

                fw.Paragraph("<id-" & tag_index & ">")

                ' print the name
                fw.Paragraph("<name type=""string"">" &  UpdateEscapeChars(CurChar.Items(i).FullNameTL) & "</name>")

                'print the minimum strength required (not currently shown on Fantasy Grounds character sheet)
                'note dagger and double dagger are converted to an escape sequence as they do not exist in the encoding used by xml and FG
                'the dagger character us Unicode 2020 and the double dagger us Unicode 2021
                fw.Paragraph("<st type=""string"">" & UpdateEscapeChars(CurChar.Items(i).DamageModeTagItem(CurMode, "minst")) & "</st>")

                'print the cost (currently shown on equipment page instead of weapons page due to space restrictions)
                fw.Paragraph("<cost type=""string"">" & StrToDbl(CurChar.Items(i).tagitem("cost")) / qty & "</cost>")

                'print the weight (currently shown on equipment page instead of weapons page due to space restrictions)
                fw.Paragraph("<weight type=""string"">" & StrToDbl(CurChar.Items(i).tagitem("weight")) /qty & "</weight>")

                'print the notes (not currently shown on Fantasy Grounds character sheet)
                fw.Paragraph("<text type=""string"">" & UpdateEscapeChars(UserVTTNotes(CurChar, i)) & "</text>") '2022-11-17 - combine user notes & vtt notes - ADS
                
                fw.Paragraph("<tl type=""string"">" & CurChar.Items(i).TagItem("techlvl") & "</tl>")
                
                db = CurChar.items(i).tagitem("chardb")
                
                weapon_mode_index = 0
                fw.Paragraph("<meleemodelist>")
                Do
                    ' create the opening tag for this weapon item
                    weapon_mode_index = weapon_mode_index + 1
                    mode_tag_index = LeadingZeroes(weapon_mode_index)

                    fw.Paragraph("<id-" & mode_tag_index & ">")

                    'print the mode
                    fw.Paragraph("<name type=""string"">" & CurChar.Items(i).DamageModeName(CurMode) & "</name>")

                    ' print the skill level
                    saved_level = CurChar.Items(i).DamageModeTagItem(CurMode, "charskillscore")
                    fw.Paragraph("<level type=""number"">" & saved_level & "</level>")

                    ' print the damage
                    DamageText = CurChar.Items(i).DamageModeTagItem(CurMode, "chardamage")
                    If CurChar.Items(i).DamageModeTagItem(CurMode, "chararmordivisor") <> "" Then
                        DamageText = DamageText & " (" & CurChar.Items(i).DamageModeTagItem(CurMode, "chararmordivisor") & ")"
                    End If
                    DamageText = DamageText & " " & CurChar.Items(i).DamageModeTagItem(CurMode, "chardamtype")
                    fw.Paragraph("<damage type=""string"">" & DamageText & "</damage>")

                    ' print the unmodified damage
                    DamageText = RemoveAfterBasicDamage(CurChar.Items(i).DamageModeTagItem(CurMode, "damage"))
                    If CurChar.Items(i).DamageModeTagItem(CurMode, "armordivisor") <> "" Then
                        DamageText = DamageText & " (" & CurChar.Items(i).DamageModeTagItem(CurMode, "armordivisor") & ")"
                    End If
                    DamageText = DamageText & " " & CurChar.Items(i).DamageModeTagItem(CurMode, "chardamtype")
                    fw.Paragraph("<unmodifiedDamage type=""string"">" & DamageText & "</unmodifiedDamage>")

                    'print the reach
                    fw.Paragraph("<reach type=""string"">" & CurChar.Items(i).DamageModeTagItem(CurMode, "charreach") & "</reach>")

                    'print the parry
                    fw.Paragraph("<parry type=""string"">" & CurChar.Items(i).DamageModeTagItem(CurMode, "charparryscore") & "</parry>")

                ' If it has a DB value, then compute a block (since I can't find the "blocklevel")
                    if db <> "" Then
                        dim tskill, pos, block
                        tskill = CurChar.Items(i).DamageModeTagItem(CurMode, "charskillused")
                        'remove surrounding quotes, if any
                        if left(tskill,1) = chr(34) then
                            tskill = mid(tskill, 2)
                        end if
                        if right(tskill,1) = chr(34) then
                            tskill = left(tskill, len(tskill)-1)
                        end if
                        'remove prefix tag, if any
                        if left(tskill, 3) = "SK:" then
                            tskill = mid(tskill, 4)
                        end if

                        pos = CurChar.ItemPositionByNameAndExt(tskill, Skills)
                        If pos > 0 Then
                            block = CurChar.Items(pos).TagItem("blocklevel")
                            blk = StrToLng(block)
                        fw.Paragraph("<block type=""string"">" & (blk + db) & "</block>")
                        End If
                    End If

                    CurMode = CurChar.Items(i).DamageModeTagItemAt("charreach", CurMode + 1)

                    fw.Paragraph("</id-" & mode_tag_index & ">") 
                Loop While CurMode > 0
                fw.Paragraph("</meleemodelist>")

                fw.Paragraph("</id-" & tag_index & ">")

            End If
        Next

    End Sub


'****************************************
'* Export Ranged Attacks
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportRangedAttacks(CurChar As GCACharacter, fw As FileWriter)

        Dim CurMode As Integer
        Dim DamageText As String
        Dim RangeText As String
        Dim i As Integer
        Dim tag_index As String
        Dim weapon_index As Integer
        Dim weapon_mode_index As Integer
        Dim mode_tag_index As String
        Dim okay As Boolean

        For i = 1 To CurChar.Items.Count
            'we only want to include ranged weapons here, so look for items with Range
            okay = False
            If CurChar.Items(i).DamageModeTagItemCount("charrangemax") > 0 Then
                okay = True
            End If

            If okay Then
                If CurChar.Items(i).TagItem("hide") = "" Then 'not hidden

                    ' loop round for each range mode
                    CurMode = CurChar.Items(i).DamageModeTagItemAt("charrangemax")

                    ' create the opening tag for this weapon item
                    weapon_index = weapon_index + 1
                    tag_index = LeadingZeroes(weapon_index)

                    fw.Paragraph("<id-" & tag_index & ">")

                    ' print the name
                    fw.Paragraph("<name type=""string"">" & UpdateEscapeChars(CurChar.Items(i).FullNameTL) & "</name>" )
                    'print the minimum strength required (not currently shown on Fantasy Grounds character sheet)
                    'note dagger and double dagger are converted to an escape sequence as they do not exist in the encoding used by xml and FG
                    'the dagger character us Unicode 2020 and the double dagger us Unicode 2021
                    fw.Paragraph("<st type=""string"">" & UpdateEscapeChars(CurChar.Items(i).DamageModeTagItem(CurMode, "minst")) & "</st>")

                    'print the bulk
                    fw.Paragraph("<bulk type=""number"">" & CurChar.Items(i).DamageModeTagItem(CurMode, "bulk") & "</bulk>")

                    'print the legality class (not currently shown on Fantasy Grounds character sheet)
                    fw.Paragraph("<lc type=""string"">" & CurChar.Items(i).TagItem("lc") & "</lc>")

                    'print the notes (not currently shown on Fantasy Grounds character sheet)
                    fw.Paragraph("<text type=""string"">" & UpdateEscapeChars(UserVTTNotes(CurChar, i)) & "</text>") '2022-11-17 - combine user notes & vtt notes - ADS

                    fw.Paragraph("<tl type=""string"">" & CurChar.Items(i).DamageModeTagItem(CurMode, "techlvl") & "</tl>")

                    weapon_mode_index = 0
                    fw.Paragraph("<rangedmodelist>")
                    Do
                        ' create the opening tag for this weapon item
                        weapon_mode_index = weapon_mode_index + 1
                        mode_tag_index = LeadingZeroes(weapon_mode_index)
            
                        fw.Paragraph("<id-" & mode_tag_index & ">")

                        'print the mode
                        fw.Paragraph("<name type=""string"">" & CurChar.Items(i).DamageModeTagItem(CurMode, "name") & "</name>")

                        ' print the skill level
                        fw.Paragraph("<level type=""number"">" & CurChar.Items(i).DamageModeTagItem(CurMode, "charskillscore") & "</level>")

                        ' print the damage
                        DamageText = CurChar.Items(i).DamageModeTagItem(CurMode, "chardamage")
                        If CurChar.Items(i).DamageModeTagItem(CurMode, "chararmordivisor") <> "" Then
                            DamageText = DamageText & " (" & CurChar.Items(i).DamageModeTagItem(CurMode, "chararmordivisor") & ")"
                        End If
                        DamageText = DamageText & " " & CurChar.Items(i).DamageModeTagItem(CurMode, "chardamtype")
                        fw.Paragraph("<damage type=""string"">" & DamageText & "</damage>")

                        ' print the unmodified damage
                        DamageText = RemoveAfterBasicDamage(CurChar.Items(i).DamageModeTagItem(CurMode, "damage"))
                        If CurChar.Items(i).DamageModeTagItem(CurMode, "armordivisor") <> "" Then
                            DamageText = DamageText & " (" & CurChar.Items(i).DamageModeTagItem(CurMode, "armordivisor") & ")"
                        End If
                        DamageText = DamageText & " " & CurChar.Items(i).DamageModeTagItem(CurMode, "chardamtype")
                        fw.Paragraph("<unmodifiedDamage type=""string"">" & DamageText & "</unmodifiedDamage>")

                        ' print the accuracy
                        fw.Paragraph("<acc type=""number"">" & CurChar.Items(i).DamageModeTagItem(CurMode, "characc") & "</acc>")

                        'print the range
                        RangeText = CurChar.Items(i).DamageModeTagItem(CurMode, "charrangehalfdam")
                        If RangeText = "" Then
                            RangeText = CurChar.Items(i).DamageModeTagItem(CurMode, "charrangemax")
                        Else
                            RangeText = RangeText & "/" & CurChar.Items(i).DamageModeTagItem(CurMode, "charrangemax")
                        End If
                        fw.Paragraph("<range type=""string"">" & RangeText & "</range>")

                        'print the RoF
                        fw.Paragraph("<rof type=""string"">" & CurChar.Items(i).DamageModeTagItem(CurMode, "charrof") & "</rof>")

                        'print the shots
                        fw.Paragraph("<shots type=""string"">" & CurChar.Items(i).DamageModeTagItem(CurMode, "charshots") & "</shots>")

                        'print the recoil
                        fw.Paragraph("<rcl type=""number"">" & CurChar.Items(i).DamageModeTagItem(CurMode, "charrcl") & "</rcl>")

                        CurMode = CurChar.Items(i).DamageModeTagItemAt("charrangemax", CurMode + 1)

                        fw.Paragraph("</id-" & mode_tag_index & ">")

                    Loop While CurMode > 0
                    fw.Paragraph("</rangedmodelist>")
        
                    fw.Paragraph("</id-" & tag_index & ">")

                End If

            End If
        Next

    End Sub


'****************************************
'* Export Protection
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportProtection(CurChar As GCACharacter, fw As FileWriter)

        Dim ListLoc As Integer
        Dim BonusDR As Integer
        Dim i As Integer
        Dim locDR As String
        Dim item_index As Integer
        Dim tag_index As String
        Dim BodyPlan As String

        if CurChar.BodyType = "" then
            BodyPlan = CurChar.HitTable.Name
        Else
            BodyPlan = CurChar.BodyType
        End If

        fw.Paragraph("<bodyplan type=""string"">" & BodyPlan & "</bodyplan>")
        'get DR bonus, if any
        ListLoc = CurChar.ItemPositionByNameAndExt("DR", Stats)
        If ListLoc > 0 Then
            If CurChar.Items(ListLoc).TagItem("score") <> 0 Then
                BonusDR = CurChar.Items(ListLoc).TagItem("score")
            End If
        End If
        If Not BonusDR Then BonusDR = 0

        ' loop through number of body locations
        For i = 1 To CurChar.Body.Count
            ' and print the ones that are to be displayed
            If CurChar.Body.Item(i).Display Then

                ' create the opening tag for this inventory item
                item_index = item_index + 1
                tag_index = LeadingZeroes(item_index)

                fw.Paragraph("<id-" & tag_index & ">")

                locDR = CurChar.Body.Item(i).DR
                If locDR.Length = 0 Then
                    locDR = 0
                End If
                If BonusDR > 0 Then
                    locDR = locDR & " +" & BonusDR
                End If

                locDR = RemoveNoteBrackets(locDR)

                fw.Paragraph("<location type=""string"">" & CurChar.Body.Item(i).Name & "</location>")
                fw.Paragraph("<dr type=""string"">" & locDR & "</dr>")

                fw.Paragraph("</id-" & tag_index & ">")

            End If
        Next

    End Sub


'****************************************
'* Export Encumbrance
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportEncumbrance(CurChar As GCACharacter, fw As FileWriter)

        Dim EncRow As Integer
        Dim ListLoc As Integer
        Dim Score As Integer

        ' set the current encumbrance check box
        EncRow = CurChar.EncumbranceLevel
        If EncRow = 0 Then
            fw.Paragraph("<enc_0 type=""number"">1</enc_0>")
        Else
            fw.Paragraph("<enc_0 type=""number"">0</enc_0>")
        End If
        If EncRow = 1 Then
            fw.Paragraph("<enc_1 type=""number"">1</enc_1>")
        Else
            fw.Paragraph("<enc_1 type=""number"">0</enc_1>")
        End If
        If EncRow = 2 Then
            fw.Paragraph("<enc_2 type=""number"">1</enc_2>")
        Else
            fw.Paragraph("<enc_2 type=""number"">0</enc_2>")
        End If
        If EncRow = 3 Then
            fw.Paragraph("<enc_3 type=""number"">1</enc_3>")
        Else
            fw.Paragraph("<enc_3 type=""number"">0</enc_3>")
        End If
        If EncRow = 4 Then
            fw.Paragraph("<enc_4 type=""number"">1</enc_4>")
        Else
            fw.Paragraph("<enc_4 type=""number"">0</enc_4>")
        End If


        ' weight list
        ListLoc = CurChar.ItemPositionByNameAndExt("No Encumbrance", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<enc0_weight type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</enc0_weight>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Light Encumbrance", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<enc1_weight type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</enc1_weight>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Medium Encumbrance", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<enc2_weight type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</enc2_weight>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Heavy Encumbrance", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<enc3_weight type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</enc3_weight>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("X-Heavy Encumbrance", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<enc4_weight type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</enc4_weight>")
        End If

        ' move list
        ListLoc = CurChar.ItemPositionByNameAndExt("No Encumbrance Move", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<enc0_move type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</enc0_move>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Light Encumbrance Move", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<enc1_move type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</enc1_move>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Medium Encumbrance Move", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<enc2_move type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</enc2_move>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Heavy Encumbrance Move", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<enc3_move type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</enc3_move>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("X-Heavy Encumbrance Move", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<enc4_move type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</enc4_move>")
        End If

        ' dodge list
        ListLoc = CurChar.ItemPositionByNameAndExt("Dodge", Stats)
        If ListLoc > 0 Then
            Score = CurChar.Items(ListLoc).TagItem("score")
            fw.Paragraph("<enc0_dodge type=""number"">" & Score & "</enc0_dodge>")
            fw.Paragraph("<enc1_dodge type=""number"">" & (Score - 1) & "</enc1_dodge>")
            fw.Paragraph("<enc2_dodge type=""number"">" & (Score - 2) & "</enc2_dodge>")
            fw.Paragraph("<enc3_dodge type=""number"">" & (Score - 3) & "</enc3_dodge>")
            fw.Paragraph("<enc4_dodge type=""number"">" & (Score - 4) & "</enc4_dodge>")
        End If

    End Sub


'****************************************
'* Export Traits
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportTraits(CurChar As GCACharacter, fw As FileWriter)

        Dim ListLoc As Integer

        fw.Paragraph("<race type=""string"">" & CurChar.Race & "</race>")
        fw.Paragraph("<height type=""string"">" & CurChar.Height & "</height>")
        fw.Paragraph("<weight type=""string"">" & CurChar.Weight & "</weight>")
        fw.Paragraph("<age type=""string"">" & CurChar.Age & "</age>")
        fw.Paragraph("<appearance type=""string"">" & CurChar.Appearance & "</appearance>")

        ListLoc = CurChar.ItemPositionByNameAndExt("Size Modifier", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<sizemodifier type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</sizemodifier>")
        End If
        ListLoc = CurChar.ItemPositionByNameAndExt("Extra Arm Reach", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<reach type=""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</reach>")
        End If

    End Sub


'****************************************
'* Export Ads and Perks
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportAds(CurChar As GCACharacter, fw As FileWriter)

        If CurChar.Count(Ads) <= 0 And CurChar.Count(Packages) <= 0 And CurChar.Count(Perks) <= 0 Then Exit Sub

        Dim i As Integer
        Dim ads_index As Integer
        Dim tag_index As String
        Dim tmp As String
        Dim work As String
        Dim Okay As Boolean
        Dim mods_text as String

        ' print the templates, metatraits, etc
        If CurChar.Count(Packages) > 0 Then
            For i = 1 To CurChar.Items.Count
                If CurChar.Items(i).ItemType = Packages And CurChar.Items(i).TagItem("hide") = "" Then
                    ' it's a package and not hidden
                    ads_index = ads_index + 1

                    tmp = CurChar.Items(i).FullName

                    work = CurChar.Items(i).LevelName
                    If work <> "" Then
                        tmp = tmp & " (" & work & ")"
                    End If

                    mods_text = CurChar.Items(i).ExpandedModCaptions(False)
                    if mods_text <> "" Then
                        mods_text = mods_text & "<br>"
                    End If

                    tag_index = LeadingZeroes(ads_index)

                    fw.Paragraph("<id-" & tag_index & ">")
                    fw.Paragraph("<name type=""string"">" & UpdateEscapeChars(tmp) & "</name>")
                    ' get the points cost
                    work = CInt(CurChar.Items(i).TagItem("points"))
                    ' if the item is a parent, subtract the points value of its children
                    If CurChar.Items(i).TagItem("childpoints") <> "" Then
                        work = work - CInt(CurChar.Items(i).TagItem("childpoints"))
                    End If
                    fw.Paragraph("<points type=""number"">" & CStr(work) & "</points>")
                    fw.Paragraph("<text type=""string"">" & mods_text & UpdateEscapeChars(UserVTTNotes(CurChar, i)) & "</text>") '2022-11-17 - combine user notes & vtt notes - ADS
                    fw.Paragraph("</id-" & tag_index & ">")

                End If
            Next
        End If

        ' print the advantages
        If CurChar.Count(Ads) > 0 Then

            For i = 1 To CurChar.Items.Count
                If (CurChar.Items(i).ItemType = Ads Or CurChar.Items(i).ItemType = Cultures Or CurChar.Items(i).ItemType = Languages) And CurChar.Items(i).TagItem("hide") = "" Then
                    ' it's an advantage and not hidden
                    Okay = True
                    If Okay Then

                        ads_index = ads_index + 1

                        tmp = CurChar.Items(i).FullName

                        work = CurChar.Items(i).LevelName
                        If work <> "" Then
                            tmp = tmp & " (" & work & ")"
                        End If

                        mods_text = CurChar.Items(i).ExpandedModCaptions(False)
                        if mods_text <> "" Then
                            mods_text = mods_text & "<br>"
                        End If

                        tag_index = LeadingZeroes(ads_index)

                        fw.Paragraph("<id-" & tag_index & ">")
                        fw.Paragraph("<name type=""string"">" & UpdateEscapeChars(tmp) & "</name>")
                        ' get the points cost
                        work = CInt(CurChar.Items(i).TagItem("points"))
                        ' if the item is a parent, subtract the points value of its children
                        If CurChar.Items(i).TagItem("childpoints") <> "" Then
                            work = work - CInt(CurChar.Items(i).TagItem("childpoints"))
                        End If
                        fw.Paragraph("<points type=""number"">" & CStr(work) & "</points>")
                        fw.Paragraph("<text type=""string"">" & mods_text & UpdateEscapeChars(UserVTTNotes(CurChar, i)) & "</text>") '2022-11-17 - combine user notes & vtt notes - ADS
                        fw.Paragraph("<pageref type=""string"">" & CurChar.Items(i).TagItem("page") & "</pageref>")
                        fw.Paragraph("<parentuuid>" & CurChar.Items(i).ParentKey & "</parentuuid>")
                        fw.Paragraph("<uuid>k" & CurChar.Items(i).idkey & "</uuid>")
                        fw.Paragraph("</id-" & tag_index & ">")

                    End If
                End If
            Next

        End If

        ' print the perks
        If CurChar.Count(Perks) > 0 Then

            For i = 1 To CurChar.Items.Count
                If CurChar.Items(i).ItemType = Perks And CurChar.Items(i).TagItem("hide") = "" Then
                    ' it's a perk and not hidden
                    ads_index = ads_index + 1

                    tmp = CurChar.Items(i).FullName

                    work = CurChar.Items(i).LevelName
                    If work <> "" Then
                        tmp = tmp & " (" & work & ")"
                    End If

                    mods_text = CurChar.Items(i).ExpandedModCaptions(False)
                    if mods_text <> "" Then
                        mods_text = mods_text & "<br>"
                    End If

                    tag_index = LeadingZeroes(ads_index)

                    fw.Paragraph("<id-" & tag_index & ">")
                    fw.Paragraph("<name type=""string"">" & UpdateEscapeChars(tmp) & "</name>")
                    ' get the points cost
                    work = CInt(CurChar.Items(i).TagItem("points"))
                    ' if the item is a parent, subtract the points value of its children
                    If CurChar.Items(i).TagItem("childpoints") <> "" Then
                        work = work - CInt(CurChar.Items(i).TagItem("childpoints"))
                    End If
                    fw.Paragraph("<points type=""number"">" & CStr(work) & "</points>")
                    fw.Paragraph("<text type=""string"">" & mods_text & UpdateEscapeChars(UserVTTNotes(CurChar, i)) & "</text>") '2022-11-17 - combine user notes & vtt notes - ADS
                    fw.Paragraph("<pageref type=""string"">" & CurChar.Items(i).TagItem("page") & "</pageref>")
                    fw.Paragraph("<parentuuid>" & CurChar.Items(i).ParentKey & "</parentuuid>")
                    fw.Paragraph("<uuid>k" & CurChar.Items(i).idkey & "</uuid>")
                    fw.Paragraph("</id-" & tag_index & ">")

                End If
            Next

        End If

    End Sub


'****************************************
'* Export Disads and Quirks
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportDisads(CurChar As GCACharacter, fw As FileWriter)

        Dim i As Integer
        Dim ads_index As Integer
        Dim tmp As String
        Dim work As String
        Dim tag_index As String
        Dim mods_text As String

        ' print the disadvantages
        If CurChar.Count(Disads) > 0 Then

            For i = 1 To CurChar.Items.Count
                If CurChar.Items(i).ItemType = Disads And CurChar.Items(i).TagItem("hide") = "" Then
                    ' it's a disadvantage and not hidden

                    ads_index = ads_index + 1

                    tmp = CurChar.Items(i).FullName

                    work = CurChar.Items(i).LevelName
                    If work <> "" Then
                        tmp = tmp & " (" & work & ")"
                    End If

                    mods_text = CurChar.Items(i).ExpandedModCaptions(False)
                    if mods_text <> "" Then
                        mods_text = mods_text & "<br>"
                    End If

                    tag_index = LeadingZeroes(ads_index)

                    fw.Paragraph("<id-" & tag_index & ">")
                    fw.Paragraph("<name type=""string"">" & CreateControlRoll(UpdateEscapeChars(tmp)) & "</name>")
                    ' get the points cost
                    work = CInt(CurChar.Items(i).TagItem("points"))
                    ' if the item is a parent, subtract the points value of its children
                    If CurChar.Items(i).TagItem("childpoints") <> "" Then
                        work = work - CInt(CurChar.Items(i).TagItem("childpoints"))
                    End If
                    fw.Paragraph("<points type=""number"">" & CStr(work) & "</points>")
                    fw.Paragraph("<text type=""string"">" & CreateControlRoll(mods_text & UpdateEscapeChars(UserVTTNotes(CurChar, i))) & "</text>") '2022-11-17 - combine user notes & vtt notes - ADS
                    fw.Paragraph("<pageref type=""string"">" & CurChar.Items(i).TagItem("page") & "</pageref>")
                    fw.Paragraph("<parentuuid>" & CurChar.Items(i).ParentKey & "</parentuuid>")
                    fw.Paragraph("<uuid>k" & CurChar.Items(i).idkey & "</uuid>")
                    fw.Paragraph("</id-" & tag_index & ">")

                End If
            Next

        End If

        ' print the quirks
        If CurChar.Count(Quirks) > 0 Then

            For i = 1 To CurChar.Items.Count
                If CurChar.Items(i).ItemType = Quirks And CurChar.Items(i).TagItem("hide") = "" Then
                    ' it's a quirk and not hidden
                    ads_index = ads_index + 1

                    tmp = CurChar.Items(i).FullName

                    work = CurChar.Items(i).LevelName
                    If work <> "" Then
                        tmp = tmp & " (" & work & ")"
                    End If

                    mods_text = CurChar.Items(i).ExpandedModCaptions(False)
                    if mods_text <> "" Then
                        mods_text = mods_text & "<br>"
                    End If

                    tag_index = LeadingZeroes(ads_index)

                    fw.Paragraph("<id-" & tag_index & ">")
                    fw.Paragraph("<name type=""string"">" & UpdateEscapeChars(tmp) & "</name>")
                    ' get the points cost
                    work = CInt(CurChar.Items(i).TagItem("points"))
                    ' if the item is a parent, subtract the points value of its children
                    If CurChar.Items(i).TagItem("childpoints") <> "" Then
                        work = work - CInt(CurChar.Items(i).TagItem("childpoints"))
                    End If
                    fw.Paragraph("<points type=""number"">" & CStr(work) & "</points>")
                    fw.Paragraph("<text type=""string"">" & mods_text & UpdateEscapeChars(UserVTTNotes(CurChar, i)) & "</text>") '2022-11-17 - combine user notes & vtt notes - ADS
                    fw.Paragraph("<pageref type=""string"">" & CurChar.Items(i).TagItem("page") & "</pageref>")
                    fw.Paragraph("<parentuuid>" & CurChar.Items(i).ParentKey & "</parentuuid>")
                    fw.Paragraph("<uuid>k" & CurChar.Items(i).idkey & "</uuid>")
                    fw.Paragraph("</id-" & tag_index & ">")

                End If
            Next

        End If

    End Sub


'****************************************
'* Export Cultural Familiarity
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportCulturalFamiliarity(CurChar As GCACharacter, fw As FileWriter)

        Dim i As Integer
        Dim item_index As Integer
        Dim tag_index As String

        For i = 1 To CurChar.Items.Count
            If CurChar.Items(i).ItemType = Cultures Then
                If CurChar.Items(i).TagItem("hide") = "" Then 'not hidden

                    item_index = item_index + 1
                    tag_index = LeadingZeroes(item_index)

                    fw.Paragraph("<id-" & tag_index & ">")

                    fw.Paragraph("<name type = ""string"">" & CurChar.Items(i).FullNameTL & "</name>")
                    fw.Paragraph("<points type = ""number"">" & CurChar.Items(i).TagItem("points") & "</points>")

                    fw.Paragraph("</id-" & tag_index & ">")

                End If
            End If
        Next

    End Sub


'****************************************
'* Export Languages
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportLanguages(CurChar As GCACharacter, fw As FileWriter)

        Dim i As Integer
        Dim item_index As Integer
        Dim tag_index As String
        Dim CurrName As String
        Dim NextName As String
        Dim tmpPoints As Integer

        For i = 1 To CurChar.Items.Count
            If CurChar.Items(i).ItemType = Languages Then
                If CurChar.Items(i).TagItem("hide") = "" Then 'not hidden

                    item_index = item_index + 1
                    tag_index = LeadingZeroes(item_index)

                    fw.Paragraph("<id-" & tag_index & ">")

                    CurrName = LCase(Trim(CurChar.Items(i).Name))
                    NextName = LCase(Trim(CurChar.Items(i + 1).Name))

                    ' print the name (adding a note if it is the native language)

                    If IsNativeLang(CurChar, i) Then
                        fw.Paragraph("<name type = ""string"">" & Trim(CurChar.Items(i).Name) & " (Native)</name>")
                    Else
                        fw.Paragraph("<name type = ""string"">" & Trim(CurChar.Items(i).Name) & "</name>")
                    End If

                    ' print the first extension (could be spoken or written, or a full language with both)
                    Select Case LCase(Trim(CurChar.Items(i).nameext))
                        Case "spoken"
                            fw.Paragraph("<spoken type = ""string"">" & CurChar.Items(i).LevelName & "</spoken>")
                        Case "written"
                            fw.Paragraph("<written type = ""string"">" & CurChar.Items(i).LevelName & "</written>")
                        Case Else
                            ' this is a full language, print the level to both spoken and written
                            fw.Paragraph("<spoken type = ""string"">" & CurChar.Items(i).LevelName & "</spoken>")
                            fw.Paragraph("<written type = ""string"">" & CurChar.Items(i).LevelName & "</written>")
                    End Select

                    ' and note the points cost
                    tmpPoints = CInt(CurChar.Items(i).TagItem("points"))

                    ' print the second extension if there are both spoken and written versions
                    If CurrName = NextName Then
                        If LCase(Trim(CurChar.Items(i + 1).nameext)) = "spoken" Then
                            fw.Paragraph("<spoken type = ""string"">" & CurChar.Items(i + 1).LevelName & "</spoken>")
                        Else
                            fw.Paragraph("<written type = ""string"">" & CurChar.Items(i + 1).LevelName & "</written>")
                        End If

                        ' add on the additional points
                        tmpPoints = tmpPoints + CInt(CurChar.Items(i + 1).TagItem("points"))

                        ' and increment i so that we skip the second character item next time round
                        i = i + 1
                    End If

                    ' print the total points
                    fw.Paragraph("<points type = ""number"">" & tmpPoints & "</points>")

                    fw.Paragraph("</id-" & tag_index & ">")

                End If
            End If
        Next

    End Sub


'****************************************
'* Export Reaction Modifiers
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportReactionModifiers(CurChar As GCACharacter, fw As FileWriter)

        Dim out As String
        Dim tmp As String
        Dim l1 As Integer

        ' ***appearance mods***
        ' print appearance reaction
        out = ""
        tmp = "Unappealing"
        l1 = CurChar.ItemPositionByNameAndExt(tmp, Stats)
        If l1 > 0 Then
            out = out & "|" & CurChar.Items(l1).TagItem("bonuslist")
        End If

        tmp = "Appealing"
        l1 = CurChar.ItemPositionByNameAndExt(tmp, Stats)
        If l1 > 0 Then
            out = out & "|" & CurChar.Items(l1).TagItem("bonuslist")
        End If

        tmp = "Status"
        l1 = CurChar.ItemPositionByNameAndExt(tmp, Stats)
        If l1 > 0 Then
            out = out & "|" & CurChar.Items(l1).TagItem("bonuslist")
        End If

        tmp = "Reaction"
        l1 = CurChar.ItemPositionByNameAndExt(tmp, Stats)
        If l1 > 0 Then
            out = out & "|" & CurChar.Items(l1).TagItem("bonuslist")
        End If

        ' Cleanup lists by adding "|" instead of "," between items. ~Stevil
        out = Replace(out, ", +", "|+")
        out = Replace(out, ", -", "|-")
        out = Replace(out, ", 0 ", "|0 ")

        fw.Paragraph(out)

    End Sub


'****************************************
'* Export Conditional Modifiers
'* Added to "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportConditionalModifiers(CurChar As GCACharacter, fw As FileWriter)

        Dim out As String
        Dim tmp As String
        Dim l1 As Integer

        ' ***appearance mods***
        ' print appearance reaction
        out = ""
        tmp = "Unappealing"
        l1 = CurChar.ItemPositionByNameAndExt(tmp, Stats)
        If l1 > 0 Then
            out = out & "|" & CurChar.Items(l1).TagItem("conditionallist")
        End If

        tmp = "Appealing"
        l1 = CurChar.ItemPositionByNameAndExt(tmp, Stats)
        If l1 > 0 Then
            out = out & "|" & CurChar.Items(l1).TagItem("conditionallist")
        End If

        tmp = "Status"
        l1 = CurChar.ItemPositionByNameAndExt(tmp, Stats)
        If l1 > 0 Then
            out = out & "|" & CurChar.Items(l1).TagItem("conditionallist")
        End If

        tmp = "Reaction"
        l1 = CurChar.ItemPositionByNameAndExt(tmp, Stats)
        If l1 > 0 Then
            out = out & "|" & CurChar.Items(l1).TagItem("conditionallist")
        End If

        ' Cleanup lists by adding "|" instead of "," between items. ~Stevil
        out = Replace(out, ", +", "|+")
        out = Replace(out, ", -", "|-")
        out = Replace(out, ", 0 ", "|0 ")

        fw.Paragraph(out)

    End Sub


'****************************************
'* Export Tech Level
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportTechLevel(CurChar As GCACharacter, fw As FileWriter)

        Dim ListLoc As Integer

        ListLoc = CurChar.ItemPositionByNameAndExt("Tech Level", Stats)
        If ListLoc > 0 Then
            fw.Paragraph("<tl type = ""string"">" & CurChar.Items(ListLoc).TagItem("score") & "</tl>")
            fw.Paragraph("<tl_points type = ""number"">" & CurChar.Items(ListLoc).TagItem("points") & "</tl_points>")
        End If

    End Sub


'****************************************
'* Export Equipment
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportEquipment(CurChar As GCACharacter, fw As FileWriter)

        Dim i As Integer
        Dim item_index As Integer
        Dim tag_index As String

        For i = 1 To CurChar.Items.Count
            If CurChar.Items(i).ItemType = Equipment Then
                ' unlike the GCA character sheets I want all items, including weapons

                If CurChar.Items(i).TagItem("hide") = "" Then
                    'not hidden

                    ' create the opening tag for this inventory item
                    item_index = item_index + 1
                    tag_index = LeadingZeroes(item_index)

                    Dim qty : qty = 1 
                    If StrToLng(CurChar.Items(i).tagitem("count")) <> 0 Then
                        qty = StrToLng(CurChar.Items(i).tagitem("count"))
                    End If
                    
                    fw.Paragraph("<id-" & tag_index & ">")
                    fw.Paragraph("<isidentified type=""number"">1</isidentified>")
                    fw.Paragraph("<name type=""string"">" & UpdateEscapeChars(CurChar.Items(i).FullNameTL) & "</name>")
                    fw.Paragraph("<count type=""number"">" & CurChar.Items(i).tagitem("count") & "</count>")
                    fw.Paragraph("<cost type=""string"">" & CurChar.Items(i).tagitem("cost") / qty & "</cost>")
                    fw.Paragraph("<weight type=""number"">" & CurChar.Items(i).tagitem("baseweight") & "</weight>")
                    fw.Paragraph("<weightsum type=""number"">" & CurChar.Items(i).tagitem("weight") / qty & "</weightsum>")
                    fw.Paragraph("<location type=""string"">" & CurChar.Items(i).tagitem("location") & "</location>")
                    fw.Paragraph("<notes type=""formattedtext"">" & UpdateEscapeChars(CurChar.Items(i).tagitem("description")) & "</notes>")
                    fw.Paragraph("<carried type=""number"">2</carried>")
                    fw.Paragraph("<pageref type=""string"">" & UpdateEscapeChars(CurChar.Items(i).tagitem("page")) & "</pageref>")
                    fw.Paragraph("<parentuuid>" & CurChar.Items(i).ParentKey & "</parentuuid>")
                    fw.Paragraph("<uuid>k" & CurChar.Items(i).idkey & "</uuid>")
                    fw.Paragraph("</id-" & tag_index & ">")

                End If
            End If
        Next

    End Sub


'****************************************
'* Export Description Note
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportDescription(CurChar As GCACharacter, fw As FileWriter)

        If CurChar.Description = "" Then Exit Sub

        'Dim tmp As String

        ' NB: need to convert carriage returns to the escape sequence '\r' here
        ' at the moment double carriage returns are treated as a single space

        ' first strip out line feeds
        'tmp = Replace(PlainText(CurChar.Description), Chr(10), "")
        'tmp = Replace(tmp, Chr(13), "\r")

        ' then print, converting carriage returns to \r
        ' (I've done this in two steps in case the pairs ever come through the other way round, e.g. after editing in a different app)
        fw.Paragraph("<description type=""string"">" & UpdateEscapeChars(RTFtoPlainText(CurChar.Description)) & "</description>") '2022-11-17 - new function is more robust - ADS

    End Sub


'****************************************
'* Export Notes
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportNotes(CurChar As GCACharacter, fw As FileWriter)

        If CurChar.Notes = "" Then Exit Sub

        'Dim tmp As String

        fw.Paragraph("<notelist>")
        fw.Paragraph("<id-00001>")

        ' NB: need to convert carriage returns to the escape sequence '\r' here
        ' at the moment double carriage returns are treated as a single space
        ' Changed the '\r' to an HTML '<br>'. ~Stevil

        ' first strip out line feeds
        'tmp = Replace(PlainText(CurChar.Notes), Chr(10), "")
        'tmp = Replace(tmp, Chr(13), "<br>")

        ' then print, converting carriage returns to \r
        ' (I've done this in two steps in case the pairs ever come through the other way round, e.g. after editing in a different app)
        fw.Paragraph("<name type=""string"">Character Note</name>")
        fw.Paragraph("<text type=""string"">" & UpdateEscapeChars(RTFtoPlainText(CurChar.Notes)) & "</text>") '2022-11-17 - new function is more robust - ADS

        fw.Paragraph("</id-00001>")
        fw.Paragraph("</notelist>")

    End Sub


'****************************************
'* Export Point Summary
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Private Sub ExportPointSummary(CurChar As GCACharacter, fw As FileWriter)
        ' note we'll export these for completeness, but FG will recalculate them

        fw.Paragraph("<attributes type=""number"">" & CurChar.Cost(Stats) & "</attributes>")
        fw.Paragraph("<ads type=""number"">" & CStr(CInt(CurChar.Cost(Ads)) + CInt(CurChar.Cost(Packages)) + CInt(CurChar.Cost(Cultures)) + CInt(CurChar.Cost(Languages))) & "</ads>")
        fw.Paragraph("<disads type=""number"">" & CurChar.Cost(Disads) & "</disads>")
        fw.Paragraph("<quirks type=""number"">" & CurChar.Cost(Quirks) & "</quirks>")
        fw.Paragraph("<skills type=""number"">" & CurChar.Cost(Skills) & "</skills>")
        fw.Paragraph("<spells type=""number"">" & CurChar.Cost(Spells) & "</spells>")

        'fw.Paragraph("<powers type=""number"">" & CurChar.Cost(Powers) & "</powers>")
        'fw.Paragraph("<others type=""number"">" & CurChar.Cost(Others) & "</others>")

        ' note GCA5 has no "Powers" or "Others", so I set them to 0... ~Stevil
        fw.Paragraph("<powers type=""number"">0</powers>")
        fw.Paragraph("<others type=""number"">0</others>")

        fw.Paragraph("<totalpoints type=""number"">" & CurChar.TotalPoints & "</totalpoints>")

        ' note that these are still strings in FG at present
        fw.Paragraph("<unspentpoints type=""number"">" & CurChar.UnspentPoints & "</unspentpoints>")

    End Sub



'****************************************
'* Function
'* Added to "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Public Function RemoveAfterBasicDamage(ByVal damage)
        Dim correctDamage As Array
        Dim MyString As String

        correctDamage = Split(damage, "+ ")
        MyString = correctDamage(0).Replace(" ", "")

        Return MyString
        
    End Function


'****************************************
'* Function
'* Added to "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Public Function CreateControlRoll(ByVal MyString)
        Dim regexCR = New Regex("CR: \d{1,2}", RegexOptions.IgnoreCase)
        Dim regexLess = New Regex("\d{1,2} or less", RegexOptions.IgnoreCase)

        MyString = MyString.Replace("[", "")
        MyString = MyString.Replace("]", "")

        Dim collectionCR As MatchCollection = regexCR.Matches(MyString)
        For Each matchCR As Match In collectionCR
            MyString = MyString.Replace(matchCR.value, "[" & matchCR.value & " or less] ")
        Next

        Dim collectionLess As MatchCollection = regexLess.Matches(MyString)
        For Each matchLess As Match In collectionLess
            MyString = MyString.Replace(matchLess.value, "[CR: " & matchLess.value & "] ")
        Next

        MyString = MyString.Replace("] or less", "]")

        Return MyString

    End Function


'****************************************
'* Function
'* Added to "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Public Function RemoveNoteBrackets(ByVal MyString)
        MyString = Replace(MyString, "[note]", "")

        Return MyString

    End Function


'****************************************
'* Function
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Public Function UpdateEscapeChars(ByVal MyString)
        MyString = Replace(MyString, Chr(10), "<br>")
        MyString = Replace(MyString, Chr(13), "<br>")
        MyString = Replace(MyString, "&", "&amp;")
        MyString = Replace(MyString, " \par", "<br>")
        MyString = Replace(MyString, Chr(134), "&#8224;") 'Single Dagger
        MyString = Replace(MyString, Chr(135), "&#8225;") 'Double Dagger
        MyString = Replace(MyString, "<", "&lt;")
        MyString = Replace(MyString, ">", "&gt;")

        Return MyString  

    End Function


'****************************************
'* Function
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Public Function LeadingZeroes(myInteger)
        Return String.Format("{0:00000}", myInteger)
    End Function


'****************************************
'* Function
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Public Function IsNativeLang(CurChar, index)

        Dim j As Integer

        For j = 1 To CurChar.Items(index).Mods.count
            If CurChar.Items(index).Mods(j).FullName = "Native Language" Then
                Return True
            End If
        Next
        Return False
    End Function


'****************************************
'* Function
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Public Function StrToDbl(ByVal aNumStr)
        'trim leading/trailing whitespace from aNumStr
        aNumStr = Trim(aNumStr)
        'handle signs and decimals w/o initial zero
        Dim Sign : Sign = Left(aNumStr, 1)
        If Sign = "-" Or Sign = "+" Then
            StrToDbl = Sign & "0" & Mid(aNumStr, 2)
        Else
            StrToDbl = "0" & aNumStr
        End If
        'format with period: d.dd (e.g. 0.01)
         StrToDbl = Replace(Replace(StrToDbl, " ", ""), ",", ".")
        'attempt to convert value to double
        On Error Resume Next

        'enable error handling
        Return CDbl(StrToDbl)
        'attempt the conversion
        If Err.Number <> 0 Then

            'if an error was thrown
            Err.Clear
            Return 0.0
        End If
        On Error GoTo 0
        'disable error handling

    End Function


'****************************************
'* Function
'* Converted from "Export to Foundry VTT"
'* ~ Stevil
'****************************************
    Function StrToLng(ByVal aNumStr)

        'trim leading/trailing whitespace from aNumStr
        aNumStr = Trim(aNumStr)

        'remove any digit grouping characters
        StrToLng = Replace(Replace(Replace(aNumStr, " ", ""), ".", ""), ",", "")

        'attempt to convert value to long
        On Error Resume Next

        'enable error handling
            Return CLng(StrToLng)
        'attempt the conversion
        If Err.Number <> 0 Then

        'if an error was thrown
            Err.Clear
            Return 0
        End If
        On Error GoTo 0
        'disable error handling

    End Function

'****************************************
'* Function
'* Convenient way to get UserNotes and VTTNotes combined
'* ~ ADS
'****************************************
    Function UserVTTNotes(CurChar as GCACharacter, Index As Integer) As String
        Dim ret As String = ""
        dim desc as string = RTFtoPlainText(CurChar.Items(Index).TagItem("description")).Trim
		Dim user As String = RTFtoPlainText(CurChar.Items(Index).TagItem("usernotes")).Trim
        Dim vtt As String = CurChar.Items(Index).TagItem("vttnotes").Trim

		If MyOptions.Value("NotesIncludeDescription") = True Then
			If desc <> "" Then ret = desc
		End If

        If user <> "" Then
            If ret = "" Then
                ret = user
            Else
                ret = ret & vblf & user
            End If
        End If
		
        If vtt <> "" Then
            If ret = "" Then
                ret = vtt
            Else
                ret = ret & vblf & vtt
            End If
        End If

        Return ret
    End Function

End Class
