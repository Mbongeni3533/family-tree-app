# Family Tree App

A modern web application for building and visualizing your family tree using Next.js, React, and TypeScript.

## Features

- **Add Family Members**: Add members with name, birth year, gender, notes, and photo
- **Define Relationships**: Link members as parent/spouse/children
- **Visual Family Tree**: Interactive tree visualization with ancestor and descendant layout
- **Edit Members**: Update existing family member information
- **Persistent Storage**: Data saved to localStorage (persists across refreshes)
- **Search & Filter**: Search by name and filter by gender
- **Export Options**: Export as PDF or image
- **Photo Support**: Upload and display family photos
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Type-safe**: Full TypeScript support

## Tech Stack

- **Framework**: Next.js 16 with App Router (TypeScript)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks with localStorage persistence
- **Export**: html2canvas + jsPDF for PDF/image export

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
family-tree/
├── app/                            # Next.js app directory
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Home page
│   └── globals.css                 # Global styles
├── components/                     # React components
│   ├── AddPersonForm.tsx          # Form to add family members
│   ├── EditPersonForm.tsx         # Form to edit family members
│   ├── FamilyTree.tsx             # Card-based family tree display
│   ├── VisualFamilyTree.tsx       # Visual tree diagram component
│   ├── SearchFilter.tsx           # Search and filter component
│   └── ExportButton.tsx           # PDF/Image export component
├── services/                       # Application services
│   └── familyTreeStorage.ts       # LocalStorage persistence
├── types/                          # TypeScript type definitions
│   └── family.ts                  # Family member and tree types
└── public/                       # Static assets
```

## How to Use

1. **Add a Family Member**: Click "+ Add Person" button to open the form
2. **Fill in Details**: Enter name (required), birth year, gender, and optional notes
3. **Add Photo**: Click the photo upload button to add a family photo
4. **Define Relationships**: Select parent and/or spouse from existing members
5. **Submit**: Click "Add Person" to save to the tree
6. **View**: See members in either List View or Visual Tree view
7. **Edit**: Click "Edit" on any member to update their information
8. **Delete**: Click "Delete" to remove a member and their relationships
9. **Search/Filter**: Use the search bar and gender filter to narrow down results
10. **Export**: Click "Export PDF" or "Export Image" to download your family tree

## Data Persistence

All family members and relationships are automatically saved to localStorage. Your data persists across:
- Page refreshes
- Browser restarts
- Closing and reopening the tab

To reset your data, clear browser localStorage for this site.

## License

MIT