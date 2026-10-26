'use client'

interface SearchFilterProps {
  searchQuery: string
  selectedGender: string
  onSearchChange: (query: string) => void
  onGenderChange: (gender: string) => void
}

export default function SearchFilter({
  searchQuery,
  selectedGender,
  onSearchChange,
  onGenderChange
}: SearchFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2 border border-[#2a2418] rounded-lg focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
        />
      </div>

      <select
        value={selectedGender}
        onChange={(e) => onGenderChange(e.target.value)}
        className="px-4 py-2 border border-[#2a2418] rounded-lg focus:ring-2 focus:ring-[#d4af37] focus:border-transparent bg-[#14110a]"
      >
        <option value="all">All Genders</option>
        <option value="male">Male (♂)</option>
        <option value="female">Female (♀)</option>
        <option value="other">Other (⚪)</option>
      </select>

      {searchQuery !== '' && (
        <button
          onClick={() => onSearchChange('')}
          className="px-4 py-2 bg-[#1b1710] hover:bg-[#241f14] text-[#e6dfc8] rounded-lg font-medium transition"
        >
          Clear
        </button>
      )}
    </div>
  )
}