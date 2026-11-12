"""Funções auxiliares (numpy) usadas pelos geradores de assets."""
import os
import numpy as np

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
IMG = os.path.join(RAIZ, 'assets', 'img')
FONTES = os.path.join(os.path.dirname(__file__), 'fontes')


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def min_cut_vertical(err):
    """Caminho de custo mínimo (de cima para baixo) numa matriz de erro HxO."""
    h, o = err.shape
    cost = err.copy()
    back = np.zeros((h, o), dtype=np.int64)
    for y in range(1, h):
        prev = cost[y - 1]
        left = np.r_[np.inf, prev[:-1]]
        right = np.r_[prev[1:], np.inf]
        stack = np.vstack([left, prev, right])
        idx = np.argmin(stack, axis=0)
        cost[y] += stack[idx, np.arange(o)]
        back[y] = idx - 1
    path = np.zeros(h, dtype=np.int64)
    path[-1] = int(np.argmin(cost[-1]))
    for y in range(h - 1, 0, -1):
        path[y - 1] = path[y] + back[y, path[y]]
    return path
