buatkan aplikasi untuk bendahara kelas, dengan nama bundahara.
Basically ada :
- landing page (header adaptif terhadap session aktif untuk tampilkan tombol dashboard atau login/signup)

Sidebar :
- Dashboard dengan tampilan chart (apexchart) pemasukan dan pengeluaran, dan total saldo, tombol untuk download laporan (PDF). Tabbed view untuk per organisasi. Jika tidak ada organisasi terdaftar maka tampilkan text "Belum ada organisasi, tekan untuk menambah organisasi baru". Tab kedua dst itu ada icon + juga untuk menambah organisasi baru.
tampilan tambah organisasi baru :
Nama Organisasi
Cabang (optional) dengan kalau tidak ada cabang, maka akan otomatis create branch "PUSAT".
Jadi tabbedviewnya bertingkat, organisasi dan cabang.

- Input dengan tampilan tabview tab pemasukan dan pengeluaran, masing2 menampilkan :
    - Tombol add, untuk menampilkan panel form input (Panel input harus tersembunyi saat tidak digunakan.):
    
    Form Input :
        - Tanggal (otomatis)
        - Nominal (custom textfield yang ada label Rp depannya, dan ada thousand separator untuk view formatting saja)
        - PIC (Person in Contact)
        - Deskripsi (optional)
        - Tombol simpan (dengan konfirmasi dan toast)
        - Tombol cancel (untuk menyembunyikan lagi panel input)
        - Tabel paginated di bawah
        - Di setiap tabel, ada icon pensil untuk mengedit, dan icon tempat sampah untuk menghapus (dengan konfirmasi dan toast)

- Akun (Deskripsi, Ubah password)
- Logout

Semua halaman dengan tema yang elegan dengan gradasi2 halaman yang subtle dan panel2 frosty glass yang konsisten di semua halaman, buat custom component untuk memudahkan reusability di page2 lain. Database menggunakan firestore database. suggest schemanya juga
- organization
- branch
- balance_sheet


buat prosedur analitik sederhana untuk menampilkan transaksi bulanan dan transaksi berdasarkan nama per organisasi dan branch


