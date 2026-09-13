param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$excel=$null;$book=$null
try {
  $excel=New-Object -ComObject Excel.Application
  $excel.Visible=$false;$excel.DisplayAlerts=$false;$excel.AutomationSecurity=3
  $book=$excel.Workbooks.Open($Path,0,$true)
  $best=@();$bestExpected=$null
  foreach($sheet in $book.Worksheets){
    $rows=[Collections.Generic.List[string]]::new();$expected=$null;$used=$sheet.UsedRange;$count=[Math]::Min($used.Rows.Count,1000000);$values=$used.Value2
    for($i=1;$i -le $count;$i++){
      $a=$values[$i,1];$b=$values[$i,2]
      if(([string]$a) -match '^SPECTRTXT=(\d+)$'){$expected=[int]$Matches[1]}
      $channel=0.0;$counts=0.0
      $okA=[double]::TryParse([string]$a,[Globalization.NumberStyles]::Float,[Globalization.CultureInfo]::InvariantCulture,[ref]$channel)
      $okB=[double]::TryParse([string]$b,[Globalization.NumberStyles]::Float,[Globalization.CultureInfo]::InvariantCulture,[ref]$counts)
      if($okA -and $okB){$rows.Add(([Convert]::ToString($channel,[Globalization.CultureInfo]::InvariantCulture)+','+[Convert]::ToString($counts,[Globalization.CultureInfo]::InvariantCulture)))}
    }
    if($rows.Count -gt $best.Count){$best=$rows;$bestExpected=$expected}
    [Runtime.InteropServices.Marshal]::ReleaseComObject($used)|Out-Null
    [Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)|Out-Null
  }
  if($best.Count -lt 3){throw 'No numeric channel/counts table with at least 3 rows was found.'}
  if($null -ne $bestExpected -and $bestExpected -ne $best.Count){[Console]::Error.WriteLine("EXPECTED_COUNT=$bestExpected;ACTUAL_COUNT=$($best.Count)")}
  [Console]::Write(($best -join "`n"))
} finally {
  if($book){$book.Close($false);[Runtime.InteropServices.Marshal]::ReleaseComObject($book)|Out-Null}
  if($excel){$excel.Quit();[Runtime.InteropServices.Marshal]::ReleaseComObject($excel)|Out-Null}
  [GC]::Collect();[GC]::WaitForPendingFinalizers()
}
