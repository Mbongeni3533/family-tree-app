'use client'

import { useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import type { FamilyMember } from '@/types/family'

interface ExportProps {
  members: FamilyMember[]
}

export function ExportButton({ members }: ExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportAsPDF = async () => {
    setIsExporting(true)
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Add title
      pdf.setFontSize(24)
      pdf.text('Family Tree', 105, 20, { align: 'center' })
      pdf.setFontSize(12)
      pdf.text(`Total members: ${members.length}`, 105, 30, { align: 'center' })

      // Add members
      let yPos = 40
      pdf.setFontSize(10)
      members.forEach(member => {
        const genderIcon = member.gender === 'male' ? '♂' : member.gender === 'female' ? '♀' : '⚪'
        pdf.text(`${member.name} ${genderIcon}`, 20, yPos)
        if (member.birthYear) {
          pdf.text(`Born: ${member.birthYear}`, 80, yPos)
        }
        yPos += 8
        if (yPos > 280) {
          pdf.addPage()
          yPos = 20
        }
      })

      pdf.save('family-tree.pdf')
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportAsImage = async () => {
    setIsExporting(true)
    try {
      const element = document.getElementById('family-tree-content')
      if (!element) return

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2
      })

      const imgData = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = imgData
      link.download = 'family-tree.png'
      link.click()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={exportAsPDF}
        disabled={isExporting}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50"
      >
        {isExporting ? 'Exporting...' : 'Export PDF'}
      </button>
      <button
        onClick={exportAsImage}
        disabled={isExporting}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50"
      >
        Export Image
      </button>
    </div>
  )
}