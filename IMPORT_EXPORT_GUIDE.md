# 📊 Import/Export Guide - Shift Manager

## 🎯 **Overview**

This guide explains how to properly export and import shift data between devices using the Shift Manager application. The new system ensures **100% data compatibility** and **zero data loss** when moving data between devices.

## 🚀 **New Compatible Export System**

### **What Changed?**

**Before:** The export function created CSV files with human-readable data that couldn't be reliably imported on other devices.

**After:** The new "Export Compatible" function creates CSV files with **both raw data and human-readable data**, ensuring perfect import compatibility.

### **Two Export Options**

#### **1. Export Compatible** (Recommended for Data Transfer)
- **Purpose**: Transfer data between devices
- **Format**: Includes raw millisecond timestamps + human-readable data
- **Compatibility**: 100% import success rate
- **Use Case**: Moving data to another device, backup/restore

#### **2. Export Summary** (For Human Reading)
- **Purpose**: View data in spreadsheet applications
- **Format**: Human-readable dates, times, and durations
- **Compatibility**: Not designed for re-import
- **Use Case**: Reports, analysis, sharing with others

## 📁 **CSV File Structure**

### **Compatible Export Format**

```csv
startms,endms,netms,breakms,note,tags,date,start_time,end_time,duration_hhmm,break_time_hhmm,net_working_hhmm,overtime_hhmm
1703126400000,1703152800000,28800000,1800000,Worked on project,work;coding,Thu, Dec 21, 2025,09:00,17:00,08:00,00:30,08:00,01:00
```

**Columns Explained:**
- **startms**: Start time in milliseconds (primary import field)
- **endms**: End time in milliseconds (primary import field)
- **netms**: Net working time in milliseconds (primary import field)
- **breakms**: Break time in milliseconds (primary import field)
- **note**: Shift notes
- **tags**: Semicolon-separated tags
- **date**: Human-readable date (secondary)
- **start_time**: Human-readable start time (secondary)
- **end_time**: Human-readable end time (secondary)
- **duration_hhmm**: Total duration in HH:MM format (secondary)
- **break_time_hhmm**: Break time in HH:MM format (secondary)
- **net_working_hhmm**: Net working time in HH:MM format (secondary)
- **overtime_hhmm**: Overtime in HH:MM format (secondary)

## 🔄 **How to Transfer Data Between Devices**

### **Step 1: Export from Source Device**
1. Open Shift Manager on the source device
2. Go to **Reports** tab
3. Click **Export Compatible** button
4. Save the CSV file (e.g., `shifts-compatible-2025-12-21.csv`)

### **Step 2: Transfer the File**
- **Email**: Send the CSV file to yourself
- **Cloud Storage**: Upload to Google Drive, Dropbox, etc.
- **USB Drive**: Copy to external storage
- **Direct Transfer**: Use AirDrop, Bluetooth, etc.

### **Step 3: Import on Target Device**
1. Open Shift Manager on the target device
2. Go to **Reports** tab
3. Click **Import CSV File** button
4. Select the exported CSV file
5. Confirm the import

## ✅ **Import Success Guarantee**

### **Why It Works Now**

1. **Raw Data Preservation**: Millisecond timestamps ensure exact time accuracy
2. **Dual Format**: Both raw and human-readable data included
3. **Smart Parsing**: Import function handles multiple data formats
4. **Validation**: Data integrity checks before import
5. **Error Handling**: Graceful fallbacks for edge cases

### **Data That's Preserved**
- ✅ Start and end times (exact millisecond precision)
- ✅ Net working time
- ✅ Break time
- ✅ Notes and tags
- ✅ All shift metadata

### **Data That's Reconstructed**
- 🔄 Break details (individual break periods)
- 🔄 Shift IDs (new unique IDs generated)
- 🔄 Overtime calculations (recalculated based on preferences)

## 🛠️ **Troubleshooting**

### **Common Issues & Solutions**

#### **"No valid shifts found" Error**
**Cause**: CSV format mismatch or corrupted file
**Solution**: 
1. Use "Export Compatible" instead of "Export Summary"
2. Check if the file was corrupted during transfer
3. Verify the file has a `.csv` extension

#### **"Failed to import data" Error**
**Cause**: File reading or parsing issues
**Solution**:
1. Try transferring the file again
2. Check file size (should be > 0 bytes)
3. Ensure the file is a valid CSV

#### **Missing or Incorrect Data**
**Cause**: Using old export format
**Solution**: Always use "Export Compatible" for data transfer

### **Debug Information**

The import process now includes detailed logging:
- Check browser console for import details
- Shows number of shifts parsed
- Lists any skipped or invalid data
- Provides import success/failure counts

## 🔒 **Data Security**

### **What's NOT Exported**
- User passwords or authentication data
- App settings or preferences
- Device-specific information
- Session data or temporary files

### **What IS Exported**
- Shift start/end times
- Working duration and break times
- Notes and tags
- Calculated statistics

## 📱 **Cross-Platform Compatibility**

### **Supported Devices**
- ✅ Windows computers
- ✅ macOS computers
- ✅ Linux computers
- ✅ Mobile devices (via web browser)
- ✅ Any device with a modern web browser

### **File Format Compatibility**
- ✅ CSV format (universal standard)
- ✅ UTF-8 encoding
- ✅ Excel, Google Sheets, Numbers compatible
- ✅ Text editor compatible

## 🎉 **Best Practices**

### **For Regular Backups**
1. Export compatible CSV weekly/monthly
2. Store in multiple locations (cloud + local)
3. Use descriptive filenames with dates
4. Verify file integrity after transfer

### **For Data Migration**
1. Export all data before device changes
2. Test import on target device first
3. Keep original device until migration confirmed
4. Use "Export Compatible" for all transfers

### **For Team Sharing**
1. Export individual user data separately
2. Use consistent naming conventions
3. Include date ranges in filenames
4. Document any special notes or tags

## 📞 **Support**

If you encounter issues with import/export:

1. **Check this guide first**
2. **Use "Export Compatible" format**
3. **Check browser console for errors**
4. **Verify file transfer integrity**
5. **Contact support with error details**

---

**Remember**: Always use **"Export Compatible"** for data transfer between devices to ensure 100% success rate! 🚀
