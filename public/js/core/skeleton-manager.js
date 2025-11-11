class SkeletonManager {
  constructor() {
    this.skeletons = {
      perfil: this.getProfileSkeleton(),
      admin: this.getAdminSkeleton(),
      ventas: this.getAdminSkeleton(),
      reservas: this.getReservasSkeleton(),
      pedidos: this.getPedidosSkeleton(),
      "ventas-pedidos": this.getVentasPedidosSkeleton(),
    };
  }

  showSkeleton(page) {
    const skeletonHTML = this.skeletons[page] || this.getDefaultSkeleton();
    const mainContent = document.getElementById("main-content");

    if (mainContent) {
      mainContent.innerHTML = skeletonHTML;
    } else {
      console.error("No se encontró #main-content");
    }
  }

  getProfileSkeleton() {
    return `
    <div class="profile-page-container">
      <div class="container py-5 mt-4">
        <div class="row">
          <!-- Sidebar skeleton - DEBE COINCIDIR CON perfil.html -->
          <div class="col-md-3">
            <div class="card shadow-sm">
              <div class="card-body text-center py-4">
                <div class="skeleton skeleton-avatar rounded-circle mx-auto mb-3" style="width: 100px; height: 100px;"></div>
                <div class="skeleton skeleton-text mx-auto mb-2" style="width: 60%; height: 20px;"></div>
                <div class="skeleton skeleton-text mx-auto mb-3" style="width: 80%; height: 16px;"></div>
                <div class="skeleton skeleton-badge mx-auto" style="width: 80px; height: 28px; border-radius: 20px;"></div>
              </div>
              <div class="list-group list-group-flush">
                <a href="#" class="list-group-item list-group-item-action">
                  <div class="skeleton skeleton-text" style="width: 70%; height: 18px;"></div>
                </a>
                <a href="#" class="list-group-item list-group-item-action">
                  <div class="skeleton skeleton-text" style="width: 60%; height: 18px;"></div>
                </a>
              </div>
            </div>
          </div>

          <!-- Main content skeleton - DEBE COINCIDIR CON perfil.html -->
          <div class="col-md-9">
            <!-- Panel de Datos Personales -->
            <div class="card shadow-sm">
              <div class="card-header">
                <div class="skeleton skeleton-text" style="width: 40%; height: 24px;"></div>
              </div>
              <div class="card-body">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <div class="skeleton skeleton-text mb-2" style="width: 30%; height: 16px;"></div>
                    <div class="skeleton skeleton-input" style="width: 100%; height: 38px;"></div>
                  </div>
                  <div class="col-md-6 mb-3">
                    <div class="skeleton skeleton-text mb-2" style="width: 30%; height: 16px;"></div>
                    <div class="skeleton skeleton-input" style="width: 100%; height: 38px;"></div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <div class="skeleton skeleton-text mb-2" style="width: 40%; height: 16px;"></div>
                    <div class="skeleton skeleton-input" style="width: 100%; height: 38px;"></div>
                  </div>
                  <div class="col-md-6 mb-3">
                    <div class="skeleton skeleton-text mb-2" style="width: 30%; height: 16px;"></div>
                    <div class="skeleton skeleton-input" style="width: 100%; height: 38px;"></div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <div class="skeleton skeleton-text mb-2" style="width: 20%; height: 16px;"></div>
                    <div class="skeleton skeleton-input" style="width: 100%; height: 38px;"></div>
                  </div>
                </div>

                <div class="skeleton skeleton-button" style="width: 150px; height: 38px; border-radius: 4px;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  getAdminSkeleton() {
    return `
    <div class="admin-page-container">
      <div class="container py-5 mt-4 admin-panel">
        <!-- Header skeleton -->
        <div class="admin-header fade-in">
          <div class="d-flex justify-content-between align-items-center flex-wrap">
            <div class="skeleton skeleton-text mb-3 mb-md-0" style="width: 250px; height: 32px;"></div>
            <div class="skeleton skeleton-text" style="width: 200px; height: 24px;"></div>
          </div>
        </div>

        <!-- Tabs skeleton -->
        <ul class="nav nav-tabs mb-4 admin-tabs" id="adminTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <div class="skeleton skeleton-tab" style="width: 150px; height: 40px; border-radius: 4px 4px 0 0;"></div>
          </li>
          <li class="nav-item" role="presentation">
            <div class="skeleton skeleton-tab" style="width: 120px; height: 40px; border-radius: 4px 4px 0 0;"></div>
          </li>
        </ul>

        <!-- Tab content skeleton -->
        <div class="tab-content fade-in">
          <!-- Professionals tab skeleton -->
          <div class="tab-pane fade show active">
            <div class="d-flex justify-content-between align-items-center mb-4 filter-controls">
              <div class="skeleton skeleton-text" style="width: 200px; height: 28px;"></div>
              <div class="skeleton skeleton-button" style="width: 180px; height: 38px; border-radius: 4px;"></div>
            </div>

            <!-- Table skeleton -->
            <div class="admin-table">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th><div class="skeleton skeleton-text" style="width: 80px; height: 20px;"></div></th>
                    <th><div class="skeleton skeleton-text" style="width: 100px; height: 20px;"></div></th>
                    <th><div class="skeleton skeleton-text" style="width: 80px; height: 20px;"></div></th>
                    <th><div class="skeleton skeleton-text" style="width: 80px; height: 20px;"></div></th>
                    <th><div class="skeleton skeleton-text" style="width: 70px; height: 20px;"></div></th>
                    <th><div class="skeleton skeleton-text" style="width: 90px; height: 20px;"></div></th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Table rows skeleton -->
                  ${Array.from(
                    { length: 5 },
                    () => `
                    <tr>
                      <td><div class="skeleton skeleton-text" style="width: 120px; height: 16px;"></div></td>
                      <td><div class="skeleton skeleton-text" style="width: 100px; height: 16px;"></div></td>
                      <td><div class="skeleton skeleton-text" style="width: 150px; height: 16px;"></div></td>
                      <td><div class="skeleton skeleton-text" style="width: 100px; height: 16px;"></div></td>
                      <td><div class="skeleton skeleton-badge" style="width: 70px; height: 24px; border-radius: 12px;"></div></td>
                      <td>
                        <div class="d-flex gap-2">
                          <div class="skeleton skeleton-button" style="width: 30px; height: 30px; border-radius: 4px;"></div>
                          <div class="skeleton skeleton-button" style="width: 30px; height: 30px; border-radius: 4px;"></div>
                        </div>
                      </td>
                    </tr>
                  `
                  ).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  getReservasSkeleton() {
    return `
      <div class="container py-5">
        <div class="skeleton skeleton-text mb-4" style="width: 40%; height: 32px;"></div>
        <div class="card">
          <div class="card-body">
            <div class="skeleton skeleton-text mb-3" style="width: 100%; height: 50px;"></div>
            <div class="skeleton skeleton-text mb-3" style="width: 100%; height: 50px;"></div>
            <div class="skeleton skeleton-text" style="width: 100%; height: 50px;"></div>
          </div>
        </div>
      </div>
    `;
  }

  // Skeleton para Mis Pedidos (usuario normal)
  getPedidosSkeleton() {
    return `
    <div class="pedidos-page-container">
      <div class="container py-5 mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div class="skeleton skeleton-text" style="width: 200px; height: 32px;"></div>
          <div class="skeleton skeleton-button" style="width: 120px; height: 38px; border-radius: 4px;"></div>
        </div>
        
        <div class="card">
          <div class="card-body">
            <ul class="list-group list-group-flush">
              ${Array.from(
                { length: 4 },
                () => `
                <li class="list-group-item d-flex justify-content-between align-items-center flex-wrap py-3">
                  <div class="me-3 mb-2 mb-md-0">
                    <div class="skeleton skeleton-text mb-2" style="width: 150px; height: 20px;"></div>
                    <div class="skeleton skeleton-text" style="width: 120px; height: 16px;"></div>
                  </div>
                  <div class="me-3 mb-2 mb-md-0">
                    <div class="skeleton skeleton-badge" style="width: 80px; height: 24px; border-radius: 12px;"></div>
                  </div>
                  <div class="me-3 mb-2 mb-md-0">
                    <div class="skeleton skeleton-text" style="width: 100px; height: 20px;"></div>
                  </div>
                  <div>
                    <div class="skeleton skeleton-button" style="width: 120px; height: 32px; border-radius: 4px;"></div>
                  </div>
                </li>
              `
              ).join("")}
            </ul>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  // Skeleton para Ventas Pedidos (con tabla y buscador)
  getVentasPedidosSkeleton() {
    return `
    <div class="ventas-pedidos-page-container">
      <div class="container py-5 mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div class="skeleton skeleton-text" style="width: 250px; height: 32px;"></div>
          <div class="skeleton skeleton-button" style="width: 120px; height: 38px; border-radius: 4px;"></div>
        </div>

        <!-- Skeleton del buscador -->
        <div class="card mb-4">
          <div class="card-body">
            <div class="row">
              <div class="col-md-8">
                <div class="skeleton skeleton-input" style="width: 100%; height: 38px;"></div>
              </div>
              <div class="col-md-4">
                <div class="skeleton skeleton-button" style="width: 100%; height: 38px; border-radius: 4px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Skeleton de la tabla -->
        <div class="card">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th><div class="skeleton skeleton-text" style="width: 60px; height: 20px;"></div></th>
                    <th><div class="skeleton skeleton-text" style="width: 120px; height: 20px;"></div></th>
                    <th><div class="skeleton skeleton-text" style="width: 100px; height: 20px;"></div></th>
                    <th><div class="skeleton skeleton-text" style="width: 80px; height: 20px;"></div></th>
                    <th><div class="skeleton skeleton-text" style="width: 120px; height: 20px;"></div></th>
                    <th><div class="skeleton skeleton-text" style="width: 90px; height: 20px;"></div></th>
                    <th><div class="skeleton skeleton-text" style="width: 150px; height: 20px;"></div></th>
                  </tr>
                </thead>
                <tbody>
                  ${Array.from(
                    { length: 6 },
                    () => `
                    <tr>
                      <td><div class="skeleton skeleton-text" style="width: 80px; height: 16px;"></div></td>
                      <td><div class="skeleton skeleton-text" style="width: 150px; height: 16px;"></div></td>
                      <td><div class="skeleton skeleton-text" style="width: 100px; height: 16px;"></div></td>
                      <td><div class="skeleton skeleton-text" style="width: 80px; height: 16px;"></div></td>
                      <td><div class="skeleton skeleton-text" style="width: 100px; height: 16px;"></div></td>
                      <td><div class="skeleton skeleton-badge" style="width: 70px; height: 24px; border-radius: 12px;"></div></td>
                      <td>
                        <div class="d-flex gap-2">
                          <div class="skeleton skeleton-button" style="width: 34px; height: 34px; border-radius: 4px;"></div>
                          <div class="skeleton skeleton-button" style="width: 120px; height: 34px; border-radius: 4px;"></div>
                        </div>
                      </td>
                    </tr>
                  `
                  ).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  getDefaultSkeleton() {
    return `
      <div class="container py-5">
        <div class="text-center">
          <div class="spinner-border text-success" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="mt-2">Cargando...</p>
        </div>
      </div>
    `;
  }
}

// Inicializar y hacer disponible globalmente
const skeletonManager = new SkeletonManager();
window.skeletonManager = skeletonManager;

export { skeletonManager };
